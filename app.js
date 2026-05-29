const STORAGE_KEY = "finals-board-state-v1";

const emptyState = {
  projects: []
};

let state = loadState();
let projectFilter = "all";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(emptyState);
  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(emptyState);
  }
}

function normalizeState(value) {
  return {
    projects: (value.projects || []).map((project) => ({
      id: project.id || crypto.randomUUID(),
      title: project.title || "",
      course: project.course || "",
      type: project.type || "大作业",
      due: project.due || "",
      status: project.status || "进行中",
      importance: project.importance || "中",
      risk: project.risk || "中",
      blocker: project.blocker || "",
      nextAction: project.nextAction || "",
      todos: (project.todos || []).map(normalizeChecklistItem),
      materials: (project.materials || []).map(normalizeChecklistItem)
    }))
  };
}

function normalizeChecklistItem(item) {
  if (typeof item === "string") {
    return { id: crypto.randomUUID(), text: item, done: false };
  }
  return {
    id: item.id || crypto.randomUUID(),
    text: item.text || "",
    done: Boolean(item.done)
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const saveStateNode = $("#saveState");
  saveStateNode.textContent = "刚刚保存";
  window.setTimeout(() => {
    saveStateNode.textContent = "已自动保存";
  }, 900);
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

function formatDate(date) {
  if (!date) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function daysUntil(date) {
  if (!date) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  return Math.ceil((due - today) / 86400000);
}

function dueLabel(project) {
  const days = daysUntil(project.due);
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天截止";
  if (days === 1) return "明天截止";
  if (days < 999) return `${days} 天后截止`;
  return "未设置截止";
}

function checklistProgress(items) {
  if (!items.length) return 0;
  return Math.round((items.filter((item) => item.done).length / items.length) * 100);
}

function projectProgress(project) {
  return checklistProgress(project.todos);
}

function materialProgress(project) {
  return checklistProgress(project.materials);
}

function openTodos(project) {
  return project.todos.filter((item) => !item.done);
}

function openMaterials(project) {
  return project.materials.filter((item) => !item.done);
}

function riskClass(risk) {
  if (risk === "高") return "red";
  if (risk === "低") return "green";
  return "yellow";
}

function statusClass(status) {
  if (status === "已提交") return "green";
  if (status === "待修改") return "yellow";
  if (status === "未开始") return "red";
  return "";
}

function riskScore(project) {
  const risk = { 高: 60, 中: 35, 低: 10 }[project.risk] || 20;
  const importance = { 高: 20, 中: 10, 低: 0 }[project.importance] || 0;
  const days = daysUntil(project.due);
  const deadline = days < 0 ? 40 : days <= 1 ? 35 : days <= 3 ? 25 : days <= 7 ? 15 : 0;
  const progressPenalty = Math.max(0, 30 - Math.round(projectProgress(project) / 4));
  const submittedBonus = project.status === "已提交" ? -200 : 0;
  return risk + importance + deadline + progressPenalty + submittedBonus;
}

function sortedProjects() {
  return [...state.projects].sort((a, b) => {
    const scoreDiff = riskScore(b) - riskScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return daysUntil(a.due) - daysUntil(b.due);
  });
}

function parseLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ id: crypto.randomUUID(), text, done: false }));
}

function renderMetrics() {
  const projects = state.projects;
  const highRisk = projects.filter((project) => project.risk === "高" && project.status !== "已提交");
  const soon = projects.filter((project) => {
    const days = daysUntil(project.due);
    return project.status !== "已提交" && days >= 0 && days <= 7;
  });
  const allTodos = projects.flatMap((project) => project.todos);
  const doneTodos = allTodos.filter((item) => item.done);
  const progress = allTodos.length ? Math.round((doneTodos.length / allTodos.length) * 100) : 0;

  $("#projectCount").textContent = projects.length;
  $("#highRiskCount").textContent = highRisk.length;
  $("#soonCount").textContent = soon.length;
  $("#overallProgress").textContent = `${progress}%`;
  $("#doneSummary").textContent = `${doneTodos.length} / ${allTodos.length} 项待办已完成`;
}

function renderPriorityList() {
  const container = $("#priorityList");
  const projects = sortedProjects().filter((project) => project.status !== "已提交").slice(0, 4);
  if (!projects.length) {
    container.innerHTML = `<div class="empty">还没有需要处理的期末项目。</div>`;
    return;
  }

  container.innerHTML = projects
    .map(
      (project) => `
        <article class="compact-card">
          <div class="tag-row">
            <span class="tag ${riskClass(project.risk)}">${project.risk}风险</span>
            <span class="tag">${formatDate(project.due)}</span>
            <span class="tag">${projectProgress(project)}%</span>
          </div>
          <h3>${escapeHtml(project.title)}</h3>
          <p class="meta-line">${escapeHtml(project.course)} · ${dueLabel(project)}</p>
          <p class="next-line">${escapeHtml(nextStep(project))}</p>
        </article>
      `
    )
    .join("");
}

function renderDeadlineRail() {
  const projects = [...state.projects]
    .filter((project) => project.status !== "已提交")
    .sort((a, b) => daysUntil(a.due) - daysUntil(b.due))
    .slice(0, 6);
  $("#deadlineRail").innerHTML = projects.length
    ? projects
        .map(
          (project) => `
            <article class="deadline-card">
              <strong>${formatDate(project.due)}</strong>
              <span>${escapeHtml(project.title)}</span>
              <small>${dueLabel(project)}</small>
            </article>
          `
        )
        .join("")
    : `<div class="empty">暂无近期截止项目。</div>`;
}

function renderMaterialGaps() {
  const gaps = sortedProjects()
    .map((project) => ({ project, items: openMaterials(project) }))
    .filter((entry) => entry.items.length)
    .slice(0, 6);

  $("#materialGapGrid").innerHTML = gaps.length
    ? gaps
        .map(
          ({ project, items }) => `
            <article class="material-gap-card">
              <div class="tag-row">
                <span class="tag">${escapeHtml(project.course)}</span>
                <span class="tag ${riskClass(project.risk)}">${project.risk}风险</span>
              </div>
              <h3>${escapeHtml(project.title)}</h3>
              <p class="meta-line">还差 ${items.length} 项材料/准备</p>
              <ul>
                ${items
                  .slice(0, 3)
                  .map((item) => `<li>${escapeHtml(item.text)}</li>`)
                  .join("")}
              </ul>
            </article>
          `
        )
        .join("")
    : `<div class="empty">材料准备项都清爽了。</div>`;
}

function nextStep(project) {
  if (project.nextAction) return project.nextAction;
  const todo = openTodos(project)[0];
  if (todo) return `下一步：${todo.text}`;
  const material = openMaterials(project)[0];
  if (material) return `先准备：${material.text}`;
  if (project.status !== "已提交") return "检查格式并准备提交";
  return "已提交";
}

function renderProjects() {
  const container = $("#projectList");
  const projects = sortedProjects().filter((project) => {
    if (projectFilter === "active") return project.status !== "已提交";
    if (projectFilter === "risk") return project.risk === "高" && project.status !== "已提交";
    if (projectFilter === "done") return project.status === "已提交";
    return true;
  });

  if (!projects.length) {
    container.innerHTML = `<div class="empty">这个视图下还没有项目。</div>`;
    return;
  }

  container.innerHTML = projects.map(renderProjectCard).join("");
}

function renderProjectCard(project) {
  const todoProgress = projectProgress(project);
  const prepProgress = materialProgress(project);
  return `
    <article class="project-card">
      <div class="project-card-head">
        <div>
          <div class="tag-row">
            <span class="tag">${escapeHtml(project.type)}</span>
            <span class="tag ${riskClass(project.risk)}">${project.risk}风险</span>
            <span class="tag ${statusClass(project.status)}">${escapeHtml(project.status)}</span>
          </div>
          <h3>${escapeHtml(project.title)}</h3>
          <p class="meta-line">${escapeHtml(project.course)} · ${dueLabel(project)}</p>
        </div>
        <button class="small-button danger" data-delete-project="${project.id}">删除</button>
      </div>

      <div class="progress-block">
        <div class="progress-label"><span>待办进度</span><strong>${todoProgress}%</strong></div>
        <div class="progress"><span style="width: ${todoProgress}%"></span></div>
      </div>
      <div class="progress-block">
        <div class="progress-label"><span>材料准备</span><strong>${prepProgress}%</strong></div>
        <div class="progress prep"><span style="width: ${prepProgress}%"></span></div>
      </div>

      <div class="card-section">
        <strong>剩余待办</strong>
        <div class="check-stack">
          ${renderChecklist(project, "todo", project.todos, "还没有待办，建议补上拆分动作。")}
        </div>
      </div>

      <div class="card-section">
        <strong>材料 / 准备项</strong>
        <div class="check-stack">
          ${renderChecklist(project, "material", project.materials, "还没有材料清单。")}
        </div>
      </div>

      <div class="card-note-grid">
        <div>
          <span>卡点</span>
          <p>${escapeHtml(project.blocker || "暂未记录")}</p>
        </div>
        <div>
          <span>下一步</span>
          <p>${escapeHtml(nextStep(project))}</p>
        </div>
      </div>

      <div class="status-row">
        <label>
          状态
          <select data-status-project="${project.id}">
            ${["未开始", "进行中", "待修改", "已提交"]
              .map(
                (status) =>
                  `<option value="${status}" ${project.status === status ? "selected" : ""}>${status}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          风险
          <select data-risk-project="${project.id}">
            ${["低", "中", "高"]
              .map((risk) => `<option value="${risk}" ${project.risk === risk ? "selected" : ""}>${risk}</option>`)
              .join("")}
          </select>
        </label>
      </div>
    </article>
  `;
}

function renderChecklist(project, kind, items, emptyText) {
  if (!items.length) return `<p class="meta-line">${emptyText}</p>`;
  return items
    .map(
      (item) => `
        <label class="check-line">
          <input type="checkbox" data-project="${project.id}" data-kind="${kind}" data-item="${item.id}" ${
            item.done ? "checked" : ""
          } />
          <span>${escapeHtml(item.text)}</span>
        </label>
      `
    )
    .join("");
}

function renderActions() {
  const projects = sortedProjects().filter((project) => project.status !== "已提交");
  $("#actionList").innerHTML = projects.length
    ? projects
        .map((project, index) => {
          const todo = openTodos(project)[0];
          const material = openMaterials(project)[0];
          return `
            <article class="action-card">
              <strong class="rank">${index + 1}</strong>
              <div>
                <div class="tag-row">
                  <span class="tag ${riskClass(project.risk)}">${project.risk}风险</span>
                  <span class="tag">${formatDate(project.due)}</span>
                  <span class="tag">${projectProgress(project)}%</span>
                </div>
                <h3>${escapeHtml(project.title)}</h3>
                <p class="meta-line">${escapeHtml(project.course)} · ${dueLabel(project)}</p>
                <p class="action-line">${escapeHtml(nextStep(project))}</p>
                ${
                  material
                    ? `<p class="meta-line">材料先补：${escapeHtml(material.text)}</p>`
                    : todo
                      ? `<p class="meta-line">当前待办：${escapeHtml(todo.text)}</p>`
                      : ""
                }
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty">没有进行中的项目，期末盘点暂时清空。</div>`;
}

function renderMaterialBoard() {
  const projects = sortedProjects();
  $("#materialBoard").innerHTML = projects.length
    ? projects
        .map(
          (project) => `
            <article class="material-project">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">${escapeHtml(project.course)}</p>
                  <h3>${escapeHtml(project.title)}</h3>
                </div>
                <span class="tag">${materialProgress(project)}%</span>
              </div>
              <div class="check-stack">
                ${renderChecklist(project, "material", project.materials, "还没有材料清单。")}
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty">先新增一个期末项目，再整理需要的材料。</div>`;
}

function renderAll() {
  renderMetrics();
  renderPriorityList();
  renderDeadlineRail();
  renderMaterialGaps();
  renderProjects();
  renderActions();
  renderMaterialBoard();
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  const dueInput = $("#projectForm [name='due']");
  if (!dueInput.value) dueInput.value = today;
}

$$(".nav-pill").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$$("[data-view-jump]").forEach((button) =>
  button.addEventListener("click", () => setView(button.dataset.viewJump))
);

$("#projectForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.projects.push({
    id: crypto.randomUUID(),
    title: values.title,
    course: values.course,
    type: values.type,
    due: values.due,
    status: values.status,
    importance: values.importance,
    risk: values.risk,
    blocker: values.blocker,
    nextAction: values.nextAction,
    todos: parseLines(values.todos),
    materials: parseLines(values.materials)
  });
  event.currentTarget.reset();
  setDefaultDates();
  saveState();
  renderAll();
});

document.body.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("[data-project][data-kind][data-item]")) {
    const project = state.projects.find((item) => item.id === target.dataset.project);
    const list = target.dataset.kind === "todo" ? project?.todos : project?.materials;
    const item = list?.find((entry) => entry.id === target.dataset.item);
    if (item) item.done = target.checked;
    saveState();
    renderAll();
  }

  if (target.matches("[data-status-project]")) {
    const project = state.projects.find((item) => item.id === target.dataset.statusProject);
    if (project) project.status = target.value;
    saveState();
    renderAll();
  }

  if (target.matches("[data-risk-project]")) {
    const project = state.projects.find((item) => item.id === target.dataset.riskProject);
    if (project) project.risk = target.value;
    saveState();
    renderAll();
  }
});

document.body.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.projectFilter) {
    projectFilter = target.dataset.projectFilter;
    $$("[data-project-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.projectFilter === projectFilter);
    });
    renderProjects();
  }

  if (target.dataset.deleteProject) {
    state.projects = state.projects.filter((project) => project.id !== target.dataset.deleteProject);
    saveState();
    renderAll();
  }
});

$("#clearData").addEventListener("click", () => {
  state = structuredClone(emptyState);
  saveState();
  renderAll();
});

setDefaultDates();
renderAll();
