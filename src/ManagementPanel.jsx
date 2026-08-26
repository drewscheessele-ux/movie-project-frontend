import { useState } from "react";

import {
  Authenticator,
} from "@aws-amplify/ui-react";

import "@aws-amplify/ui-react/styles.css";

import {
  fetchAuthSession,
} from "aws-amplify/auth";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;


/*
 * Make an authenticated request
 * to one of our protected API routes.
 */
async function authenticatedRequest(
  path,
  options = {}
) {
  const session =
    await fetchAuthSession();

  const accessToken =
    session.tokens?.accessToken?.toString();

  if (!accessToken) {
    throw new Error(
      "No Cognito access token is available."
    );
  }

  return fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,

      headers: {
        "content-type":
          "application/json",

        Authorization:
          `Bearer ${accessToken}`,

        ...(options.headers ?? {}),
      },
    }
  );
}


function AdminControls({
  people,
  onChanged,
  signOut,
  user,
}) {
  const [personId, setPersonId] =
    useState("");

  const [personName, setPersonName] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [working, setWorking] =
    useState(false);


  async function handleAddPerson(
    event
  ) {
    event.preventDefault();

    setMessage("");
    setError("");
    setWorking(true);

    try {
      const response =
        await authenticatedRequest(
          "/people",
          {
            method: "POST",

            body: JSON.stringify({
              person_id:
                personId.trim(),

              name:
                personName.trim(),
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Could not add person."
        );
      }

      setPersonId("");
      setPersonName("");

      setMessage(
        `${result.person.name} was added.`
      );

      await onChanged();
    }

    catch (err) {
      console.error(err);

      setError(
        err.message ??
          "Could not add person."
      );
    }

    finally {
      setWorking(false);
    }
  }


  async function handleTogglePerson(
    person
  ) {
    setMessage("");
    setError("");
    setWorking(true);

    try {
      const response =
        await authenticatedRequest(
          `/people/${person.person_id}`,
          {
            method: "PATCH",

            body: JSON.stringify({
              enabled:
                !person.enabled,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Could not update person."
        );
      }

      setMessage(
        `${person.name} is now ${
          !person.enabled
            ? "being tracked"
            : "paused"
        }.`
      );

      await onChanged();
    }

    catch (err) {
      console.error(err);

      setError(
        err.message ??
          "Could not update person."
      );
    }

    finally {
      setWorking(false);
    }
  }


  async function handleDeletePerson(
    person
  ) {
    const confirmed =
      window.confirm(
        `Remove ${person.name} from tracking? ` +
        "Their existing project history will remain."
      );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    setWorking(true);

    try {
      const response =
        await authenticatedRequest(
          `/people/${person.person_id}`,
          {
            method: "DELETE",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Could not remove person."
        );
      }

      setMessage(
        `${person.name} was removed from tracking.`
      );

      await onChanged();
    }

    catch (err) {
      console.error(err);

      setError(
        err.message ??
          "Could not remove person."
      );
    }

    finally {
      setWorking(false);
    }
  }


  return (
    <div className="admin-controls">

      <div className="admin-header">
        <div>
          <span className="admin-label">
            SIGNED IN
          </span>

          <h3>
            Manage tracked people
          </h3>

          <p>
            {user?.signInDetails
              ?.loginId ?? "Administrator"}
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={signOut}
        >
          Sign out
        </button>
      </div>


      <form
        className="add-person-form"
        onSubmit={handleAddPerson}
      >
        <div className="admin-field">
          <label htmlFor="new-name">
            Name
          </label>

          <input
            id="new-name"
            value={personName}
            onChange={(event) =>
              setPersonName(
                event.target.value
              )
            }
            placeholder="Florence Pugh"
            required
          />
        </div>


        <div className="admin-field">
          <label htmlFor="new-id">
            TMDB Person ID
          </label>

          <input
            id="new-id"
            value={personId}
            onChange={(event) =>
              setPersonId(
                event.target.value
              )
            }
            placeholder="1373737"
            required
          />
        </div>


        <button
          className="primary-button"
          disabled={working}
        >
          {working
            ? "Working..."
            : "Add person"}
        </button>
      </form>


      {message && (
        <div className="admin-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="admin-message error">
          {error}
        </div>
      )}


      <div className="admin-people-list">

        {people.map(
          (person) => (
            <div
              className="admin-person-row"
              key={person.person_id}
            >

              <div>
                <strong>
                  {person.name}
                </strong>

                <span>
                  TMDB #{person.person_id}
                </span>
              </div>


              <div className="admin-actions">

                <button
                  className="secondary-button"
                  onClick={() =>
                    handleTogglePerson(
                      person
                    )
                  }
                  disabled={working}
                >
                  {person.enabled
                    ? "Pause"
                    : "Resume"}
                </button>


                <button
                  className="danger-button"
                  onClick={() =>
                    handleDeletePerson(
                      person
                    )
                  }
                  disabled={working}
                >
                  Remove
                </button>

              </div>

            </div>
          )
        )}

      </div>

    </div>
  );
}


export default function ManagementPanel({
  people,
  onChanged,
}) {
  return (
    <details className="management-shell">

      <summary>
        Manage tracked people
      </summary>

      <div className="management-auth">

        <Authenticator
          hideSignUp
        >
          {({
            signOut,
            user,
          }) => (
            <AdminControls
              people={people}
              onChanged={onChanged}
              signOut={signOut}
              user={user}
            />
          )}
        </Authenticator>

      </div>

    </details>
  );
}