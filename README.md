# Petal Planner

A responsive, pastel task-management app for tracking action items by project. It includes a dashboard, master table, calendar, Kanban board, Eisenhower matrix, and daily and weekly planning views.

Task changes are saved in the browser for offline use. When signed in, tasks and project details also sync privately through Firebase so they appear on other devices.

## Finish Firebase setup

The Firebase web configuration is already connected. Complete these two one-time steps in the [Firebase Console](https://console.firebase.google.com/):

1. Open **Authentication → Sign-in method**, choose **Email/Password**, enable it, and save.
2. Open **Firestore Database**, create the database, then open its **Rules** tab. Replace the rules with the contents of `firestore.rules` and publish them.

The included rules allow a signed-in user to read and write only the planner stored under their own Firebase user ID.

## Run locally

1. Install [Node.js](https://nodejs.org/) 22 or newer.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local address shown in the terminal.

## Deploy to GitHub Pages

1. Create a new GitHub repository and upload/push this folder to its `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. The included workflow builds and publishes the app after every push to `main`.

Without signing in, each browser/device keeps its own task list. After signing in with the same email and password, changes sync across devices automatically.

## Production build

Run `npm run build`. The deployable site is created in `dist/`.
