const taskList = document.querySelector("#task-list");
const taskDialog = document.querySelector("#task-dialog");
const taskForm = document.querySelector("#task-form");
const taskTitle = document.querySelector("#task-title");
const taskDescription = document.querySelector("#task-description");
const taskId = document.querySelector("#task-id");
const formError = document.querySelector("#form-error");
const notice = document.querySelector("#notice");
const taskFilter = document.querySelector("#task-filter");

let tasks = [];
let noticeTimer;

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date());

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "The request could not be completed.");
  }
  return response.status === 204 ? null : response.json();
}

function showNotice(message, isError = false) {
  window.clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.classList.toggle("notice-error", isError);
  notice.hidden = false;
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 4000);
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card${task.completed ? " is-completed" : ""}`;
  card.dataset.id = task.id;

  const checkbox = document.createElement("button");
  checkbox.className = "task-checkbox";
  checkbox.type = "button";
  checkbox.setAttribute("aria-label", task.completed ? "Mark task as in progress" : "Mark task as completed");
  checkbox.setAttribute("aria-pressed", String(task.completed));
  checkbox.textContent = task.completed ? "✓" : "";

  const copy = document.createElement("div");
  copy.className = "task-copy";
  const title = document.createElement("h3");
  title.textContent = task.title;
  copy.append(title);
  if (task.description) {
    const description = document.createElement("p");
    description.textContent = task.description;
    copy.append(description);
  }

  const meta = document.createElement("span");
  meta.className = "task-date";
  meta.textContent = task.completed ? "Completed" : "In progress";

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const editButton = document.createElement("button");
  editButton.className = "icon-button edit-task";
  editButton.type = "button";
  editButton.setAttribute("aria-label", `Edit ${task.title}`);
  editButton.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.9 4.1a1.8 1.8 0 0 1 2.5 2.5L7 15l-3.5 1 1-3.5 8.4-8.4Z"/><path d="m11.7 5.3 2.5 2.5"/></svg>';
  const deleteButton = document.createElement("button");
  deleteButton.className = "icon-button delete-task";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 6V4h4v2m2.5 0-.6 10h-7L6.3 6m2.2 3v4m3-4v4"/></svg>';
  actions.append(editButton, deleteButton);

  card.append(checkbox, copy, meta, actions);
  return card;
}

function renderTasks() {
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter.value === "active") return !task.completed;
    if (taskFilter.value === "completed") return task.completed;
    return true;
  });

  taskList.replaceChildren();
  if (visibleTasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const icon = document.createElement("span");
    icon.className = "empty-icon";
    icon.textContent = taskFilter.value === "completed" ? "✓" : "✦";
    const heading = document.createElement("h3");
    heading.textContent = taskFilter.value === "completed"
      ? "No completed tasks yet"
      : taskFilter.value === "active" ? "You’re all caught up" : "A fresh start";
    const message = document.createElement("p");
    message.textContent = taskFilter.value === "completed"
      ? "Tasks you finish will find a home here."
      : taskFilter.value === "active" ? "There’s nothing left on your list. Enjoy the breathing room."
      : "Add your first task and make today count.";
    empty.append(icon, heading, message);
    if (taskFilter.value !== "completed" && taskFilter.value !== "active") {
      const addButton = document.createElement("button");
      addButton.className = "text-button";
      addButton.type = "button";
      addButton.textContent = "Create your first task →";
      addButton.addEventListener("click", openCreateDialog);
      empty.append(addButton);
    }
    taskList.append(empty);
  } else {
    visibleTasks.forEach((task) => taskList.append(createTaskCard(task)));
  }

  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  document.querySelector("#task-total").textContent = String(total);
  document.querySelector("#nav-count").textContent = String(total);
  document.querySelector("#progress-count").innerHTML =
    `${completed} <span>/ ${total} completed</span>`;
  document.querySelector("#progress-fill").style.width = `${percentage}%`;
  document.querySelector(".progress-bar").setAttribute("aria-valuenow", String(percentage));
  document.querySelector("#progress-message").textContent = total
    ? percentage === 100 ? "You did it — every task is complete!" : "Keep going, you’re making great progress."
    : "Every task is a step forward.";
}

async function loadTasks() {
  try {
    tasks = await request("/api/tasks");
    renderTasks();
  } catch (error) {
    showNotice(error.message, true);
  }
}

function openCreateDialog() {
  taskForm.reset();
  taskId.value = "";
  formError.hidden = true;
  document.querySelector("#dialog-title").textContent = "Create a task";
  document.querySelector("#save-task").textContent = "Add task";
  taskDialog.showModal();
  taskTitle.focus();
}

function openEditDialog(task) {
  taskForm.reset();
  taskId.value = String(task.id);
  taskTitle.value = task.title;
  taskDescription.value = task.description;
  formError.hidden = true;
  document.querySelector("#dialog-title").textContent = "Edit your task";
  document.querySelector("#save-task").textContent = "Save changes";
  taskDialog.showModal();
  taskTitle.focus();
}

document.querySelector("#open-task-form").addEventListener("click", openCreateDialog);
document.querySelectorAll(".close-dialog").forEach((button) => {
  button.addEventListener("click", () => taskDialog.close());
});
taskFilter.addEventListener("change", renderTasks);

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editing = Boolean(taskId.value);
  const button = document.querySelector("#save-task");
  button.disabled = true;
  button.textContent = editing ? "Saving..." : "Adding...";
  formError.hidden = true;

  try {
    await request(editing ? `/api/tasks/${taskId.value}` : "/api/tasks", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify({ title: taskTitle.value, description: taskDescription.value })
    });
    taskDialog.close();
    showNotice(editing ? "Your task has been updated." : "Your new task is ready.");
    await loadTasks();
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = editing ? "Save changes" : "Add task";
  }
});

taskList.addEventListener("click", async (event) => {
  const card = event.target.closest(".task-card");
  if (!card) return;
  const task = tasks.find((item) => item.id === Number(card.dataset.id));
  if (!task) return;

  try {
    if (event.target.closest(".task-checkbox")) {
      await request(`/api/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ completed: !task.completed })
      });
      await loadTasks();
    } else if (event.target.closest(".edit-task")) {
      openEditDialog(task);
    } else if (event.target.closest(".delete-task")) {
      if (!window.confirm(`Delete "${task.title}"? This can’t be undone.`)) return;
      await request(`/api/tasks/${task.id}`, { method: "DELETE" });
      showNotice("Task deleted.");
      await loadTasks();
    }
  } catch (error) {
    showNotice(error.message, true);
  }
});

loadTasks();