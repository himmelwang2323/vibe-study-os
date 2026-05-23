const STORAGE_KEY = "vibe-study-os-state";

const demoState = {
  goals: [
    {
      id: crypto.randomUUID(),
      title: "建立机器学习基础能力",
      deadline: "2026-08-31",
      why: "为后续科研和项目实践打好数学、代码、论文阅读的共同底座。",
      milestones: [
        { id: crypto.randomUUID(), text: "完成线性代数核心概念复习", done: true },
        { id: crypto.randomUUID(), text: "每周精读 1 篇经典论文", done: false },
        { id: crypto.randomUUID(), text: "复现 2 个小型模型实验", done: false }
      ]
    },
    {
      id: crypto.randomUUID(),
      title: "形成稳定论文写作节奏",
      deadline: "2026-12-20",
      why: "把阅读、实验、写作变成连续产出，而不是临近 deadline 才启动。",
      milestones: [
        { id: crypto.randomUUID(), text: "整理 Related Work 卡片库", done: true },
        { id: crypto.randomUUID(), text: "每周完成 500 字实验记录", done: false }
      ]
    }
  ],
  tasks: [
    {
      id: crypto.randomUUID(),
      title: "读完优化方法 lecture 2 并整理错题",
      course: "机器学习",
      week: 1,
      due: "2026-05-27",
      load: "中",
      goalId: null,
      done: false
    },
    {
      id: crypto.randomUUID(),
      title: "完成英文摘要初稿",
      course: "论文写作",
      week: 1,
      due: "2026-05-29",
      load: "重",
      goalId: null,
      done: false
    },
    {
      id: crypto.randomUUID(),
      title: "复盘本周阅读卡片",
      course: "科研习惯",
      week: 2,
      due: "2026-06-02",
      load: "轻",
      goalId: null,
      done: true
    }
  ],
  reviews: [
    {
      id: crypto.randomUUID(),
      date: "2026-05-24",
      type: "日复盘",
      content: "完成学习系统原型需求拆分，明确长期目标、学期任务、日周复盘三层结构。",
      reflection: "系统应该先服务每天的动作，再向上反映目标进度。",
      minutes: 90,
      energy: 4
    }
  ]
};

demoState.tasks[0].goalId = demoState.goals[0].id;
demoState.tasks[1].goalId = demoState.goals[1].id;

let state = loadState();
let taskFilter = "all";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(demoState);
  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(demoState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const saveStateNode = $("#saveState");
  saveStateNode.textContent = "刚刚保存";
  window.setTimeout(() => {
    saveStateNode.textContent = "已自动保存";
  }, 900);
}

function formatDate(date) {
  if (!date) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function getProgress(goal) {
  if (!goal.milestones.length) return 0;
  const done = goal.milestones.filter((item) => item.done).length;
  return Math.round((done / goal.milestones.length) * 100);
}

function goalName(goalId) {
  return state.goals.find((goal) => goal.id === goalId)?.title || "未关联目标";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setView(viewId) {
  $$(".nav-pill").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  $$(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
}

function renderMetrics() {
  const openTasks = state.tasks.filter((task) => !task.done);
  const doneTasks = state.tasks.filter((task) => task.done);
  const today = new Date().toISOString().slice(0, 10);
  const todayReviews = state.reviews.filter((review) => review.date === today);
  const todayMinutes = todayReviews.reduce((sum, review) => sum + Number(review.minutes || 0), 0);

  $("#goalCount").textContent = state.goals.length;
  $("#goalMomentum").textContent = `${Math.round(
    state.goals.reduce((sum, goal) => sum + getProgress(goal), 0) / Math.max(state.goals.length, 1)
  )}% 平均推进`;
  $("#weekTaskCount").textContent = openTasks.length;
  $("#weekDoneCount").textContent = `${doneTasks.length} 项已完成`;
  $("#todayMinutes").textContent = `${todayMinutes}m`;
  $("#todayFocus").textContent = todayReviews[0]?.content.slice(0, 16) || "未记录专注点";
  $("#reviewCount").textContent = state.reviews.length;
}

function renderGoalFlow() {
  const container = $("#goalFlow");
  if (!state.goals.length) {
    container.innerHTML = `<div class="empty">先添加一个长期目标，再把它切成小目标。</div>`;
    return;
  }

  container.innerHTML = state.goals
    .map((goal) => {
      const progress = getProgress(goal);
      const next = goal.milestones.find((item) => !item.done)?.text || "已完成全部小目标";
      return `
        <article class="flow-item">
          <div class="tag-row">
            <span class="tag green">${progress}%</span>
            <span class="tag">截止 ${formatDate(goal.deadline)}</span>
          </div>
          <h3>${escapeHtml(goal.title)}</h3>
          <div class="progress"><span style="width: ${progress}%"></span></div>
          <p class="meta-line">下一步：${escapeHtml(next)}</p>
        </article>
      `;
    })
    .join("");
}

function renderWeekMap() {
  const weeks = [1, 2, 3, 4];
  $("#weekMap").innerHTML = weeks
    .map((week) => {
      const tasks = state.tasks.filter((task) => Number(task.week) === week);
      const label = tasks.length
        ? tasks.map((task) => `${task.done ? "✓" : "•"} ${escapeHtml(task.title)}`).join("<br />")
        : "尚未排入任务";
      return `
        <article class="week-cell">
          <strong>第 ${week} 周</strong>
          <span>${label}</span>
        </article>
      `;
    })
    .join("");
}

function renderTodayStrip() {
  const upcoming = [...state.tasks]
    .filter((task) => !task.done)
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 3);
  $("#todayStrip").innerHTML = upcoming.length
    ? upcoming
        .map(
          (task) => `
          <article class="today-item">
            <div class="tag-row">
              <span class="tag yellow">${escapeHtml(task.course)}</span>
              <span class="tag">截止 ${formatDate(task.due)}</span>
            </div>
            <h3>${escapeHtml(task.title)}</h3>
            <p class="meta-line">关联：${escapeHtml(goalName(task.goalId))}</p>
          </article>
        `
        )
        .join("")
    : `<div class="empty">当前没有进行中的学期任务。</div>`;
}

function renderGoalSelect() {
  const options = [`<option value="">不关联</option>`]
    .concat(state.goals.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.title)}</option>`))
    .join("");
  $("#goalSelect").innerHTML = options;
}

function renderGoals() {
  const container = $("#goalList");
  if (!state.goals.length) {
    container.innerHTML = `<div class="empty">还没有长期目标。</div>`;
    return;
  }

  container.innerHTML = state.goals
    .map(
      (goal) => `
      <article class="flow-item">
        <div class="tag-row">
          <span class="tag green">${getProgress(goal)}%</span>
          <span class="tag">截止 ${formatDate(goal.deadline)}</span>
        </div>
        <h3>${escapeHtml(goal.title)}</h3>
        <p class="meta-line">${escapeHtml(goal.why || "暂未填写推进理由")}</p>
        <div class="progress"><span style="width: ${getProgress(goal)}%"></span></div>
        <div class="milestone-list">
          ${goal.milestones
            .map(
              (item) => `
              <label class="check-line">
                <input type="checkbox" data-goal="${goal.id}" data-milestone="${item.id}" ${
                  item.done ? "checked" : ""
                } />
                <span>${escapeHtml(item.text)}</span>
              </label>
            `
            )
            .join("")}
        </div>
        <div class="item-actions">
          <button class="small-button danger" data-delete-goal="${goal.id}">删除目标</button>
        </div>
      </article>
    `
    )
    .join("");
}

function loadClass(load) {
  if (load === "重") return "red";
  if (load === "轻") return "green";
  return "yellow";
}

function renderTasks() {
  const container = $("#taskList");
  const tasks = state.tasks.filter((task) => {
    if (taskFilter === "open") return !task.done;
    if (taskFilter === "done") return task.done;
    return true;
  });

  if (!tasks.length) {
    container.innerHTML = `<div class="empty">这个过滤条件下没有任务。</div>`;
    return;
  }

  container.innerHTML = tasks
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .map(
      (task) => `
      <article class="task-item">
        <div class="tag-row">
          <span class="tag">${escapeHtml(task.course)}</span>
          <span class="tag ${loadClass(task.load)}">${escapeHtml(task.load)}负荷</span>
          <span class="tag">第 ${task.week} 周</span>
        </div>
        <h3>${task.done ? "✓ " : ""}${escapeHtml(task.title)}</h3>
        <p class="meta-line">截止 ${formatDate(task.due)} · ${escapeHtml(goalName(task.goalId))}</p>
        <div class="item-actions">
          <button class="small-button" data-toggle-task="${task.id}">${task.done ? "标记进行中" : "标记完成"}</button>
          <button class="small-button danger" data-delete-task="${task.id}">删除</button>
        </div>
      </article>
    `
    )
    .join("");
}

function renderReviews() {
  const container = $("#reviewList");
  if (!state.reviews.length) {
    container.innerHTML = `<div class="empty">还没有复盘记录。</div>`;
    return;
  }

  container.innerHTML = [...state.reviews]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (review) => `
      <article class="review-item">
        <div class="tag-row">
          <span class="tag green">${escapeHtml(review.type)}</span>
          <span class="tag">${formatDate(review.date)}</span>
          <span class="tag">${Number(review.minutes || 0)}m</span>
          <span class="tag yellow">能量 ${review.energy}/5</span>
        </div>
        <h3>${escapeHtml(review.content)}</h3>
        <p class="meta-line">${escapeHtml(review.reflection || "还没有写调整策略")}</p>
        <div class="item-actions">
          <button class="small-button danger" data-delete-review="${review.id}">删除</button>
        </div>
      </article>
    `
    )
    .join("");
}

function renderAll() {
  renderMetrics();
  renderGoalFlow();
  renderWeekMap();
  renderTodayStrip();
  renderGoalSelect();
  renderGoals();
  renderTasks();
  renderReviews();
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  $("#reviewForm [name='date']").value = today;
  $("#goalForm [name='deadline']").value = "2026-12-31";
  $("#taskForm [name='due']").value = today;
}

$$(".nav-pill").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$$("[data-view-jump]").forEach((button) =>
  button.addEventListener("click", () => setView(button.dataset.viewJump))
);

$("#goalForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.goals.push({
    id: crypto.randomUUID(),
    title: values.title,
    deadline: values.deadline,
    why: values.why,
    milestones: values.milestones
      .split("\n")
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ id: crypto.randomUUID(), text, done: false }))
  });
  event.currentTarget.reset();
  setDefaultDates();
  saveState();
  renderAll();
});

$("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.tasks.push({
    id: crypto.randomUUID(),
    title: values.title,
    course: values.course,
    week: Number(values.week || 1),
    due: values.due,
    load: values.load,
    goalId: values.goalId || null,
    done: false
  });
  event.currentTarget.reset();
  setDefaultDates();
  saveState();
  renderAll();
});

$("#reviewForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.reviews.push({
    id: crypto.randomUUID(),
    date: values.date,
    type: values.type,
    content: values.content,
    reflection: values.reflection,
    minutes: Number(values.minutes || 0),
    energy: Number(values.energy || 3)
  });
  event.currentTarget.reset();
  setDefaultDates();
  saveState();
  renderAll();
});

$("#quickTaskForm").addEventListener("submit", (event) => {
  const values = formValues(event.currentTarget);
  if (!values.title || !values.course) return;
  state.tasks.push({
    id: crypto.randomUUID(),
    title: values.title,
    course: values.course,
    week: 1,
    due: new Date().toISOString().slice(0, 10),
    load: "中",
    goalId: state.goals[0]?.id || null,
    done: false
  });
  event.currentTarget.reset();
  saveState();
  renderAll();
});

document.body.addEventListener("change", (event) => {
  const target = event.target;
  if (!target.matches("[data-goal][data-milestone]")) return;
  const goal = state.goals.find((item) => item.id === target.dataset.goal);
  const milestone = goal?.milestones.find((item) => item.id === target.dataset.milestone);
  if (milestone) {
    milestone.done = target.checked;
    saveState();
    renderAll();
  }
});

document.body.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.open) {
    $(`#${target.dataset.open}`).showModal();
  }

  if (target.dataset.taskFilter) {
    taskFilter = target.dataset.taskFilter;
    $$("[data-task-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.taskFilter === taskFilter);
    });
    renderTasks();
  }

  if (target.dataset.toggleTask) {
    const task = state.tasks.find((item) => item.id === target.dataset.toggleTask);
    if (task) task.done = !task.done;
    saveState();
    renderAll();
  }

  if (target.dataset.deleteTask) {
    state.tasks = state.tasks.filter((item) => item.id !== target.dataset.deleteTask);
    saveState();
    renderAll();
  }

  if (target.dataset.deleteGoal) {
    state.goals = state.goals.filter((item) => item.id !== target.dataset.deleteGoal);
    state.tasks = state.tasks.map((task) =>
      task.goalId === target.dataset.deleteGoal ? { ...task, goalId: null } : task
    );
    saveState();
    renderAll();
  }

  if (target.dataset.deleteReview) {
    state.reviews = state.reviews.filter((item) => item.id !== target.dataset.deleteReview);
    saveState();
    renderAll();
  }
});

$("#resetDemo").addEventListener("click", () => {
  state = structuredClone(demoState);
  saveState();
  renderAll();
});

setDefaultDates();
renderAll();
