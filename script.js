const STORAGE_KEY = "nccu-food-roulette-stores-v1";
const ATTEMPT_KEY = "nccu-food-roulette-attempts-v1";

const DEFAULT_STORES = [
  "滇味廚房",
  "四川飯館",
  "敏忠小吃店",
  "樂坡",
  "阿里郎韓式料理",
  "焿大王",
  "雞肉本家",
  "珍妹"
];

const COLORS = [
  "#D9B99B", // 奶茶
  "#A3B18A", // 抹茶
  "#F0D58A", // 奶黃
  "#E2A18E", // 肉桂粉
  "#C8BDAF", // 燕麥灰
  "#B9A7C9", // 淡芋紫
  "#9EB4C4", // 莫蘭迪藍
  "#D6BFAF"
];

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spinButton");
const attemptCount = document.getElementById("attemptCount");
const resultName = document.getElementById("resultName");
const resultHint = document.getElementById("resultHint");
const statusPill = document.getElementById("statusPill");
const storeList = document.getElementById("storeList");
const storeCount = document.getElementById("storeCount");
const emptyState = document.getElementById("emptyState");
const addForm = document.getElementById("addForm");
const storeInput = document.getElementById("storeInput");
const restoreButton = document.getElementById("restoreButton");
const clearButton = document.getElementById("clearButton");
const modal = document.getElementById("guaranteeModal");
const modalClose = document.getElementById("modalClose");
const acceptSeven = document.getElementById("acceptSeven");
const restartButton = document.getElementById("restartButton");
const toast = document.getElementById("toast");

let stores = loadStores();
let attempts = loadAttempts();
let rotation = 0;
let isSpinning = false;
let lastWinner = null;
let toastTimer = null;

function loadStores() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) {
      return saved
        .filter(item => item && typeof item.name === "string")
        .map(item => ({ name: item.name, enabled: item.enabled !== false }));
    }
  } catch (error) {
    console.warn("無法讀取店家清單", error);
  }
  return DEFAULT_STORES.map(name => ({ name, enabled: true }));
}

function saveStores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
}

function loadAttempts() {
  const saved = Number(localStorage.getItem(ATTEMPT_KEY));
  return Number.isFinite(saved) && saved >= 0 && saved <= 5 ? saved : 5;
}

function saveAttempts() {
  localStorage.setItem(ATTEMPT_KEY, String(attempts));
}

function getEnabledStores() {
  return stores.filter(store => store.enabled);
}

function renderStoreList() {
  storeList.innerHTML = "";

  stores.forEach((store, index) => {
    const li = document.createElement("li");
    li.className = `store-item ${store.enabled ? "" : "disabled"}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = store.enabled;
    checkbox.title = "是否參與轉盤";
    checkbox.addEventListener("change", () => {
      stores[index].enabled = checkbox.checked;
      saveStores();
      drawWheel();
      updateUI();
    });

    const name = document.createElement("span");
    name.className = "store-name";
    name.textContent = store.name;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-store";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = `刪除 ${store.name}`;
    deleteButton.addEventListener("click", () => {
      stores.splice(index, 1);
      saveStores();
      drawWheel();
      updateUI();
      showToast(`已刪除「${store.name}」`);
    });

    li.append(checkbox, name, deleteButton);
    storeList.appendChild(li);
  });

  emptyState.classList.toggle("hidden", getEnabledStores().length > 0);
}

function updateUI() {
  const enabledCount = getEnabledStores().length;

  attemptCount.textContent = attempts;
  storeCount.textContent = `${enabledCount} 間可抽選`;
  spinButton.disabled = isSpinning;

  if (isSpinning) {
    statusPill.textContent = "命運運轉中…";
  } else if (attempts === 0) {
    statusPill.textContent = "今日次數已用完";
  } else if (enabledCount === 0) {
    statusPill.textContent = "請先加入店家";
  } else {
    statusPill.textContent = "準備開轉";
  }
}

function resizeCanvasForDPR() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const size = Math.max(300, Math.floor(rect.width));
  canvas.width = Math.floor(size * dpr);
  canvas.height = Math.floor(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return size;
}

function drawWheel() {
  const size = resizeCanvasForDPR();
  const center = size / 2;
  const radius = size * 0.43;
  const enabledStores = getEnabledStores();

  ctx.clearRect(0, 0, size, size);

  // 外圈陰影
  ctx.beginPath();
  ctx.arc(center, center, radius + 9, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFDF9";
  ctx.shadowColor = "rgba(77, 67, 59, 0.16)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 7;
  ctx.fill();
  ctx.shadowColor = "transparent";

  if (!enabledStores.length) {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#E9DECE";
    ctx.fill();

    ctx.fillStyle = "#806754";
    ctx.font = "700 18px 'Noto Sans TC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("請加入可抽選的店家", center, center);
    return;
  }

  const slice = (Math.PI * 2) / enabledStores.length;

  enabledStores.forEach((store, index) => {
    const start = rotation - Math.PI / 2 + index * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[index % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 253, 249, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawWheelLabel(store.name, center, radius, start, slice);
  });

  // 外圈
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#FFFDF9";
  ctx.lineWidth = 8;
  ctx.stroke();

  // 中心圓
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.23, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFDF9";
  ctx.fill();
  ctx.strokeStyle = "rgba(184, 155, 132, .25)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawWheelLabel(text, center, radius, start, slice) {
  const angle = start + slice / 2;
  const textRadius = radius * 0.67;
  const x = center + Math.cos(angle) * textRadius;
  const y = center + Math.sin(angle) * textRadius;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);

  // 讓文字盡量保持正向
  if (Math.cos(angle) < 0) ctx.rotate(Math.PI);

  let fontSize = Math.max(10, Math.min(18, 280 / getEnabledStores().length));
  if (getEnabledStores().length <= 5) fontSize = 17;
  ctx.font = `700 ${fontSize}px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = "#4D433B";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxChars = getEnabledStores().length >= 8 ? 5 : 8;
  const displayText = text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
  ctx.fillText(displayText, 0, 0);
  ctx.restore();
}

function spin() {
  const enabledStores = getEnabledStores();

  if (isSpinning) return;

  if (!enabledStores.length) {
    showToast("至少要有一家可抽選的店家！");
    return;
  }

  if (attempts <= 0) {
    openGuaranteeModal();
    return;
  }

  isSpinning = true;
  updateUI();

  const winnerIndex = Math.floor(Math.random() * enabledStores.length);
  const slice = (Math.PI * 2) / enabledStores.length;

  // 指針固定在正上方；將中獎扇形中心旋到 12 點鐘方向。
  const targetBase = -winnerIndex * slice;
  const currentNormalized = normalizeAngle(rotation);
  let targetRotation = targetBase;

  while (targetRotation <= currentNormalized) {
    targetRotation += Math.PI * 2;
  }

  const extraTurns = 6 + Math.floor(Math.random() * 3);
  targetRotation += extraTurns * Math.PI * 2;

  const startRotation = rotation;
  const totalChange = targetRotation - startRotation;
  const duration = 4200 + Math.random() * 900;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);

    rotation = startRotation + totalChange * eased;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      rotation = targetRotation;
      const winner = enabledStores[winnerIndex];
      lastWinner = winner.name;

      attempts -= 1;
      saveAttempts();

      resultName.textContent = winner.name;
      resultHint.textContent = attempts > 0
        ? `這次用了 1 次機會，還剩 ${attempts} 次。`
        : "5 次機會已經用完，再按一次就會觸發小7保底。";

      statusPill.textContent = "命運已決定！";
      isSpinning = false;
      updateUI();
      drawWheel();

      showToast(`今天就吃「${winner.name}」！`);

      // 最後一次抽完不立即彈窗，符合 PRD「再度點擊抽籤時」觸發。
      if (attempts === 0) {
        spinButton.disabled = false;
      }
    }
  }

  requestAnimationFrame(animate);
}

function normalizeAngle(angle) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function openGuaranteeModal() {
  modal.classList.remove("hidden");
}

function closeGuaranteeModal() {
  modal.classList.add("hidden");
}

function resetAttempts() {
  attempts = 5;
  saveAttempts();
  resultName.textContent = "等待你的第一次抽選";
  resultHint.textContent = "按下中央按鈕，看看今天的午餐／晚餐由誰接手。";
  statusPill.textContent = "準備開轉";
  closeGuaranteeModal();
  updateUI();
  showToast("抽選次數已重置！");
}

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = storeInput.value.trim();

  if (!name) {
    showToast("請先輸入店家名稱。");
    storeInput.focus();
    return;
  }

  if (stores.some(store => store.name === name)) {
    showToast("這家店已經在名單裡囉！");
    return;
  }

  stores.push({ name, enabled: true });
  saveStores();
  storeInput.value = "";
  renderStoreList();
  drawWheel();
  updateUI();
  showToast(`已新增「${name}」`);
});

restoreButton.addEventListener("click", () => {
  stores = DEFAULT_STORES.map(name => ({ name, enabled: true }));
  saveStores();
  renderStoreList();
  drawWheel();
  updateUI();
  showToast("已恢復政大預設美食名單！");
});

clearButton.addEventListener("click", () => {
  if (!stores.length) {
    showToast("名單已經是空的。");
    return;
  }

  stores = [];
  saveStores();
  renderStoreList();
  drawWheel();
  updateUI();
  showToast("已清空店家名單。");
});

spinButton.addEventListener("click", spin);

modalClose.addEventListener("click", closeGuaranteeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeGuaranteeModal();
});

acceptSeven.addEventListener("click", () => {
  closeGuaranteeModal();
  resetAttempts();
});

restartButton.addEventListener("click", () => {
  localStorage.removeItem(ATTEMPT_KEY);
  window.location.reload();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    closeGuaranteeModal();
  }
});

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

window.addEventListener("resize", drawWheel);

renderStoreList();
drawWheel();
updateUI();
