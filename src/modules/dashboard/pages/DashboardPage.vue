<script setup lang="ts">
import { ref } from "vue";

import { useAuth } from "@/modules/auth/composables/useAuth";

interface Project {
  id: number;
  name: string;
  organization: string;
  year: number;
  status: "Draft" | "Published";
}

const { isAuthenticated } = useAuth();
const projects = ref<Project[]>([
  { id: 1, name: "Community Care Program", organization: "North District", year: 2025, status: "Published" },
  { id: 2, name: "Youth Employment Initiative", organization: "Social Impact Lab", year: 2025, status: "Draft" },
  { id: 3, name: "Senior Digital Inclusion", organization: "City Foundation", year: 2024, status: "Published" }
]);
const selectedProject = ref<number | null>(null);

const deleteProject = (project: Project): void => {
  if (!window.confirm(`Delete “${project.name}”? This action cannot be undone.`)) return;
  projects.value = projects.value.filter(({ id }) => id !== project.id);
};
</script>

<template>
  <section class="projects">
    <div class="projects__intro">
      <div>
        <p class="projects__eyebrow">PROJECT INDEX</p>
        <h1>Projects</h1>
      </div>

      <RouterLink v-if="isAuthenticated" class="button button--primary" to="/forms/new">
        <span>＋</span> Add project
      </RouterLink>
      <RouterLink v-else class="button button--primary" to="/login?redirect=/">
        Sign in to manage
      </RouterLink>
    </div>

    <p v-if="!isAuthenticated" class="projects__notice">
      Projects are public to view. Sign in to add, edit, or delete them.
    </p>

    <div class="project-list">
      <div class="project-list__header" aria-hidden="true">
        <span>Project</span>
        <span>Organization</span>
        <span>Year</span>
        <span>Status</span>
        <span v-if="isAuthenticated">Actions</span>
      </div>

      <article
        v-for="project in projects"
        :key="project.id"
        class="project-row"
        :class="{ 'project-row--open': selectedProject === project.id }"
      >
        <button
          class="project-row__title"
          type="button"
          :aria-expanded="selectedProject === project.id"
          @click="selectedProject = selectedProject === project.id ? null : project.id"
        >
          {{ project.name }}
        </button>
        <span data-label="Organization">{{ project.organization }}</span>
        <span data-label="Year">{{ project.year }}</span>
        <span data-label="Status" class="project-row__status">{{ project.status }}</span>
        <div v-if="isAuthenticated" class="project-row__actions">
          <button type="button">Edit</button>
          <button type="button" @click="deleteProject(project)">Delete</button>
        </div>

        <div v-if="selectedProject === project.id" class="project-row__detail">
          <span>Project ID — {{ String(project.id).padStart(4, "0") }}</span>
          <p>SROI project overview. Detailed project information will appear here.</p>
        </div>
      </article>

      <p v-if="projects.length === 0" class="project-list__empty">No projects found.</p>
    </div>
  </section>
</template>

<style scoped>
.projects {
  display: grid;
  gap: 36px;
}

.projects__intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.projects__eyebrow {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: clamp(52px, 9vw, 104px);
  font-weight: 500;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 10px 18px;
  border: 1px solid #000;
  color: #000;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.button--primary {
  background: #000;
  color: #fff;
}

.button--primary:hover {
  background: #fff;
  color: #000;
}

.projects__notice {
  margin: -12px 0 0;
  padding: 13px 0;
  border-top: 1px solid #aaa;
  border-bottom: 1px solid #aaa;
  color: #555;
  font-size: 13px;
}

.project-list {
  border-top: 2px solid #000;
}

.project-list__header,
.project-row {
  display: grid;
  grid-template-columns: minmax(240px, 2fr) minmax(180px, 1fr) 80px 100px 130px;
  gap: 20px;
  align-items: center;
}

.project-list__header {
  min-height: 45px;
  border-bottom: 1px solid #000;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.project-list__header span:last-child {
  text-align: right;
}

.project-row {
  min-height: 82px;
  border-bottom: 1px solid #000;
  font-size: 13px;
}

.project-list__header > :last-child:nth-child(4),
.project-row > :last-child:nth-child(4) {
  grid-column: 4 / 6;
}

.project-row__title {
  border: 0;
  padding: 0;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 17px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.project-row__title:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.project-row__status {
  font-size: 11px;
  text-transform: uppercase;
}

.project-row__actions {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
}

.project-row__actions button {
  border: 0;
  border-bottom: 1px solid #000;
  padding: 2px 0;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.project-row__detail {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(240px, 2fr) 1fr;
  gap: 20px;
  padding: 4px 0 24px;
  color: #555;
  font-size: 12px;
}

.project-row__detail p,
.project-list__empty {
  margin: 0;
}

.project-list__empty {
  padding: 40px 0;
  border-bottom: 1px solid #000;
  color: #555;
}

@media (max-width: 840px) {
  .project-list__header {
    display: none;
  }

  .project-row {
    grid-template-columns: 1fr auto;
    gap: 12px 20px;
    padding: 22px 0;
  }

  .project-row__title {
    grid-column: 1 / -1;
  }

  .project-row > span::before {
    content: attr(data-label) " — ";
    color: #777;
  }

  .project-row__actions {
    grid-column: 2;
    grid-row: 2 / span 2;
  }

  .project-row__detail {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .projects__intro {
    align-items: stretch;
    flex-direction: column;
  }

  .button {
    width: 100%;
  }
}
</style>
