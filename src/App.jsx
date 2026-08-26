import { useEffect, useMemo, useState } from "react";
import "./App.css";
import ManagementPanel
  from "./ManagementPanel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
console.log("API URL:", API_BASE_URL);

function App() {
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);

  const [activeTab, setActiveTab] = useState("projects");
  const [search, setSearch] = useState("");

  const [mediaFilter, setMediaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");

  const [sortBy, setSortBy] = useState("discovered-desc");

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
          project_id:
            project.project_id,

          title:
            project.title,

          media_type:
            project.media_type,

          release_date:
            project.release_date,

          discovered_at:
            project.discovered_at,

          poster_path:
            project.poster_path ?? "",

          overview:
            project.overview ?? "",

          genres:
            project.genres ?? [],

          tmdb_url:
            project.tmdb_url ?? "",

          people: [],
        });
      }
      
      const groupedProject =
        projectMap.get(key);

      /*
      * If one person's record has
      * richer metadata, use it.
      */

      if (
        !groupedProject.poster_path
        && project.poster_path
      ) {
        groupedProject.poster_path =
          project.poster_path;
      }

      if (
        !groupedProject.overview
        && project.overview
      ) {
        groupedProject.overview =
          project.overview;
      }

      if (
        groupedProject.genres.length === 0
        && project.genres?.length
      ) {
        groupedProject.genres =
          project.genres;
      }

      if (
        !groupedProject.tmdb_url
        && project.tmdb_url
      ) {
        groupedProject.tmdb_url =
          project.tmdb_url;
      }

      groupedProject.people.push({
        person_id:
          project.person_id,

        person_name:
          project.person_name,

        roles:
          project.roles ?? [],
      });

      if (
        project.discovered_at >
        groupedProject.discovered_at
      ) {
        groupedProject.discovered_at =
          project.discovered_at;
      }
    }

    return Array.from(
      projectMap.values()
    ).sort(
      (a, b) =>
        (b.discovered_at ?? "")
          .localeCompare(
            a.discovered_at ?? ""
          )
    );
  }, [projects]);

  const projectPeople = useMemo(() => {
    const names = new Set();

    for (const project of groupedProjects) {
      for (const person of project.people) {
        if (person.person_name) {
          names.add(person.person_name);
        }
      }
    }

    return Array.from(names).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [groupedProjects]);


  const projectGenres = useMemo(() => {
    const genres = new Set();

    for (const project of groupedProjects) {
      for (const genre of project.genres ?? []) {
        genres.add(genre);
      }
    }

    return Array.from(genres).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [groupedProjects]);

  const filteredProjects = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    const today = getTodayIso();

    let results = groupedProjects.filter(
      (project) => {

        // ------------------------
        // Search
        // ------------------------

        if (query) {
          const titleMatch =
            project.title
              ?.toLowerCase()
              .includes(query);

          const personMatch =
            project.people.some(
              (person) =>
                person.person_name
                  ?.toLowerCase()
                  .includes(query)
            );

          if (
            !titleMatch &&
            !personMatch
          ) {
            return false;
          }
        }


        // ------------------------
        // Movie / TV filter
        // ------------------------

        if (
          mediaFilter !== "all" &&
          project.media_type !== mediaFilter
        ) {
          return false;
        }


        // ------------------------
        // Release status filter
        // ------------------------

        if (statusFilter !== "all") {

          if (!project.release_date) {
            if (
              statusFilter !== "unknown"
            ) {
              return false;
            }
          }

          else if (
            statusFilter === "upcoming" &&
            project.release_date <= today
          ) {
            return false;
          }

          else if (
            statusFilter === "released" &&
            project.release_date > today
          ) {
            return false;
          }

          else if (
            statusFilter === "unknown"
          ) {
            return false;
          }
        }


        // ------------------------
        // Person filter
        // ------------------------

        if (personFilter !== "all") {

          const hasPerson =
            project.people.some(
              (person) =>
                person.person_name ===
                personFilter
            );

          if (!hasPerson) {
            return false;
          }
        }


        // ------------------------
        // Genre filter
        // ------------------------

        if (genreFilter !== "all") {

          const hasGenre =
            project.genres?.includes(
              genreFilter
            );

          if (!hasGenre) {
            return false;
          }
        }


        return true;
      }
    );


    // ------------------------
    // Sorting
    // ------------------------

    results = [...results].sort(
      (a, b) => {

        if (
          sortBy ===
          "discovered-desc"
        ) {
          return (
            b.discovered_at ?? ""
          ).localeCompare(
            a.discovered_at ?? ""
          );
        }

        if (
          sortBy ===
          "release-asc"
        ) {

          if (
            !a.release_date &&
            !b.release_date
          ) {
            return 0;
          }

          if (!a.release_date) {
            return 1;
          }

          if (!b.release_date) {
            return -1;
          }

          return a.release_date.localeCompare(
            b.release_date
          );
        }

        if (
          sortBy ===
          "release-desc"
        ) {

          if (
            !a.release_date &&
            !b.release_date
          ) {
            return 0;
          }

          if (!a.release_date) {
            return 1;
          }

          if (!b.release_date) {
            return -1;
          }

          return b.release_date.localeCompare(
            a.release_date
          );
        }

        if (
          sortBy === "title-asc"
        ) {
          return (
            a.title ?? ""
          ).localeCompare(
            b.title ?? ""
          );
        }

        return 0;
      }
    );

    return results;

  }, [
    groupedProjects,
    search,
    mediaFilter,
    statusFilter,
    personFilter,
    genreFilter,
    sortBy
  ]);

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

  function getPosterUrl(
    posterPath
  ) {
    if (!posterPath) {
      return "";
    }

    return (
      "https://image.tmdb.org/t/p/w500"
      + posterPath
    );
  }

  function getTodayIso() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

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

  function getReleaseStatus(
    releaseDate
  ) {
    if (!releaseDate) {
      return "unknown";
    }

    const today = getTodayIso();

    if (releaseDate > today) {
      return "upcoming";
    }

    return "released";
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">
            AWS SERVERLESS PROJECT
          </p>

          <h1>Movie Project Tracker</h1>

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

    {activeTab === "projects" && (
      <section className="filters">

        <div className="filter-control">
          <label htmlFor="media-filter">
            Type
          </label>

          <select
            id="media-filter"
            value={mediaFilter}
            onChange={(event) =>
              setMediaFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All
            </option>

            <option value="movie">
              Movies
            </option>

            <option value="tv">
              TV
            </option>
          </select>
        </div>


        <div className="filter-control">
          <label htmlFor="status-filter">
            Status
          </label>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All
            </option>

            <option value="upcoming">
              Upcoming
            </option>

            <option value="released">
              Released
            </option>

            <option value="unknown">
              No release date
            </option>
          </select>
        </div>


        <div className="filter-control">
          <label htmlFor="person-filter">
            Person
          </label>

          <select
            id="person-filter"
            value={personFilter}
            onChange={(event) =>
              setPersonFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              Everyone
            </option>

            {projectPeople.map(
              (personName) => (
                <option
                  value={personName}
                  key={personName}
                >
                  {personName}
                </option>
              )
            )}
          </select>
        </div>


        <div className="filter-control">
          <label htmlFor="genre-filter">
            Genre
          </label>

          <select
            id="genre-filter"
            value={genreFilter}
            onChange={(event) =>
              setGenreFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All genres
            </option>

            {projectGenres.map(
              (genre) => (
                <option
                  value={genre}
                  key={genre}
                >
                  {genre}
                </option>
              )
            )}
          </select>
        </div>


        <div className="filter-control sort-control">
          <label htmlFor="sort-filter">
            Sort by
          </label>

          <select
            id="sort-filter"
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value
              )
            }
          >
            <option value="discovered-desc">
              Recently discovered
            </option>

            <option value="release-asc">
              Release date: soonest
            </option>

            <option value="release-desc">
              Release date: latest
            </option>

            <option value="title-asc">
              Title: A–Z
            </option>
          </select>
        </div>

      </section>
    )}

    <div className="filter-actions">

      <button
        className="clear-filters"
        onClick={() => {
          setMediaFilter("all");
          setStatusFilter("all");
          setPersonFilter("all");
          setGenreFilter("all");
          setSortBy(
            "discovered-desc"
          );
          setSearch("");
        }}
      >
        Clear filters
      </button>

    </div>

    {activeTab === "projects" && (
      <div className="results-summary">

        Showing{" "}
        <strong>
          {filteredProjects.length}
        </strong>{" "}
        of{" "}
        <strong>
          {groupedProjects.length}
        </strong>{" "}
        projects

      </div>
    )}

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
                      <div className="poster-container">
                        {project.poster_path ? (
                          <img
                            className="project-poster"
                            src={getPosterUrl(
                              project.poster_path
                            )}
                            alt={`${project.title} poster`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="poster-placeholder">
                            <span>No poster</span>
                          </div>
                        )}
                      </div>

                      <div className="project-content">

                        <div className="project-top">
                          <span className="type-badge">
                            {project.media_type === "tv"
                              ? "TV"
                              : "MOVIE"}
                          </span>

                          <span className="release-date">
                            {formatDate(
                              project.release_date
                            )}
                          </span>
                          <span
                            className={
                              `status-badge ${
                                getReleaseStatus(
                                  project.release_date
                                )
                              }`
                            }
                          >
                            {getReleaseStatus(
                              project.release_date
                            ) === "upcoming"
                              ? "Upcoming"
                              : getReleaseStatus(
                                  project.release_date
                                ) === "released"
                              ? "Released"
                              : "Date TBD"}
                          </span>

                        </div>

                        <h2>{project.title}</h2>

                        {project.genres?.length > 0 && (
                          <div className="genre-list">
                            {project.genres.map(
                              (genre) => (
                                <span
                                  className="genre"
                                  key={genre}
                                >
                                  {genre}
                                </span>
                              )
                            )}
                          </div>
                        )}

                        {project.overview && (
                          <p className="overview">
                            {project.overview}
                          </p>
                        )}

                        <div className="people-list">

                          {project.people.map(
                            (person) => (
                              <div
                                className="person-credit"
                                key={person.person_id}
                              >
                                <strong>
                                  {person.person_name}
                                </strong>

                                {person.roles.length > 0 && (
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

                        {project.tmdb_url && (
                          <a
                            className="tmdb-link"
                            href={project.tmdb_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on TMDB →
                          </a>
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
          {!error &&
            !loading &&
            activeTab === "people" && (
              <ManagementPanel
                people={people}
                onChanged={loadData}
              />
            )}
      </main>

      <footer>
        <div>
          Movie Project Tracker · AWS serverless
          learning project
        </div>

        <div className="tmdb-credit">
          This product uses the TMDB API but is not
          endorsed or certified by TMDB.
        </div>
      </footer>
    </div>
  );
}

export default App;