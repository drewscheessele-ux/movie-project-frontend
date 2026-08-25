import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
console.log("API URL:", API_BASE_URL);

function App() {
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);

  const [activeTab, setActiveTab] = useState("projects");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [projectsResponse, peopleResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/projects`),
          fetch(`${API_BASE_URL}/people`),
        ]);

      if (!projectsResponse.ok) {
        throw new Error(
          `Projects request failed: ${projectsResponse.status}`
        );
      }

      if (!peopleResponse.ok) {
        throw new Error(
          `People request failed: ${peopleResponse.status}`
        );
      }

      const projectsData = await projectsResponse.json();
      const peopleData = await peopleResponse.json();

      setProjects(projectsData.projects ?? []);
      setPeople(peopleData.people ?? []);
    } catch (err) {
      console.error(err);

      setError(
        "Could not load data from the Movie Project API."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /*
   * TrackedProjects stores one item for each
   * person/project relationship.
   *
   * Here we combine records belonging to the same
   * movie/show so the UI doesn't show duplicates.
   */
  const groupedProjects = useMemo(() => {
    const projectMap = new Map();

    for (const project of projects) {
      const key =
        `${project.media_type}#${project.project_id}`;

      if (!projectMap.has(key)) {
        projectMap.set(key, {
          project_id: project.project_id,
          title: project.title,
          media_type: project.media_type,
          release_date: project.release_date,
          discovered_at: project.discovered_at,
          people: [],
        });
      }

      const groupedProject = projectMap.get(key);

      groupedProject.people.push({
        person_id: project.person_id,
        person_name: project.person_name,
        roles: project.roles ?? [],
      });

      if (
        project.discovered_at >
        groupedProject.discovered_at
      ) {
        groupedProject.discovered_at =
          project.discovered_at;
      }
    }

    return Array.from(projectMap.values()).sort(
      (a, b) =>
        (b.discovered_at ?? "").localeCompare(
          a.discovered_at ?? ""
        )
    );
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return groupedProjects;
    }

    return groupedProjects.filter((project) => {
      const titleMatch = project.title
        ?.toLowerCase()
        .includes(query);

      const personMatch = project.people.some(
        (person) =>
          person.person_name
            ?.toLowerCase()
            .includes(query)
      );

      return titleMatch || personMatch;
    });
  }, [groupedProjects, search]);

  const filteredPeople = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return people;
    }

    return people.filter((person) =>
      person.name
        ?.toLowerCase()
        .includes(query)
    );
  }, [people, search]);

  function formatDate(date) {
    if (!date) {
      return "Release date unknown";
    }

    const parsedDate = new Date(
      `${date}T00:00:00`
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">
            AWS SERVERLESS PROJECT
          </p>

          <h1>Project Tracker</h1>

          <p className="subtitle">
            Automatically tracking movie and
            television projects for people you follow.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <main>
        <section className="stats">
          <div className="stat-card">
            <span>Projects</span>
            <strong>
              {groupedProjects.length}
            </strong>
          </div>

          <div className="stat-card">
            <span>Tracked People</span>
            <strong>{people.length}</strong>
          </div>

          <div className="stat-card">
            <span>Tracking</span>
            <strong>
              {
                people.filter(
                  (person) => person.enabled
                ).length
              }
            </strong>
          </div>
        </section>

        <div className="toolbar">
          <div className="tabs">
            <button
              className={
                activeTab === "projects"
                  ? "tab active"
                  : "tab"
              }
              onClick={() =>
                setActiveTab("projects")
              }
            >
              Projects
            </button>

            <button
              className={
                activeTab === "people"
                  ? "tab active"
                  : "tab"
              }
              onClick={() =>
                setActiveTab("people")
              }
            >
              People
            </button>
          </div>

          <input
            className="search"
            type="search"
            placeholder={
              activeTab === "projects"
                ? "Search projects or people..."
                : "Search people..."
            }
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="read-only-banner">
          Read-only mode — management controls will
          be added after frontend authentication.
        </div>

        {error && (
          <div className="error-message">
            <strong>Something went wrong.</strong>
            <span>{error}</span>

            <button onClick={loadData}>
              Try again
            </button>
          </div>
        )}

        {!error &&
          loading &&
          projects.length === 0 && (
            <div className="empty-state">
              Loading your tracker…
            </div>
          )}

        {!error &&
          !loading &&
          activeTab === "projects" && (
            <section className="project-grid">
              {filteredProjects.length === 0 ? (
                <div className="empty-state">
                  No matching projects found.
                </div>
              ) : (
                filteredProjects.map(
                  (project) => (
                    <article
                      className="project-card"
                      key={`${project.media_type}-${project.project_id}`}
                    >
                      <div className="project-top">
                        <span className="type-badge">
                          {project.media_type ===
                          "tv"
                            ? "TV"
                            : "MOVIE"}
                        </span>

                        <span className="release-date">
                          {formatDate(
                            project.release_date
                          )}
                        </span>
                      </div>

                      <h2>{project.title}</h2>

                      <div className="people-list">
                        {project.people.map(
                          (person) => (
                            <div
                              className="person-credit"
                              key={
                                person.person_id
                              }
                            >
                              <strong>
                                {
                                  person.person_name
                                }
                              </strong>

                              {person.roles.length >
                                0 && (
                                <span>
                                  {person.roles.join(
                                    ", "
                                  )}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </article>
                  )
                )
              )}
            </section>
          )}

        {!error &&
          !loading &&
          activeTab === "people" && (
            <section className="people-grid">
              {filteredPeople.length === 0 ? (
                <div className="empty-state">
                  No matching people found.
                </div>
              ) : (
                filteredPeople.map((person) => (
                  <article
                    className="person-card"
                    key={person.person_id}
                  >
                    <div>
                      <h2>{person.name}</h2>

                      <span className="person-id">
                        TMDB #{person.person_id}
                      </span>
                    </div>

                    <div className="person-status">
                      <span
                        className={
                          person.enabled
                            ? "status-dot enabled"
                            : "status-dot disabled"
                        }
                      />

                      {person.enabled
                        ? "Tracking"
                        : "Paused"}
                    </div>

                    <div className="person-meta">
                      <span>
                        {person.initialized
                          ? "Initialized"
                          : "Initializing"}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}
      </main>

      <footer>
        Movie Project Tracker · AWS serverless
        learning project
      </footer>
    </div>
  );
}

export default App;