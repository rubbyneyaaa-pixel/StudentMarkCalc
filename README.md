# Student Marks Calculator

A simple, beginner-friendly webpage for calculating student marks and grades. Enter a student's name, register number, and five subject marks to see the total, average, percentage, grade, and pass/fail result. Saved records are kept in the browser's IndexedDB database and can be viewed or deleted later.

## Features

- Calculates total marks, average, percentage, and grade.
- Uses the requested A+ to F grading scale.
- A student passes only when every subject mark is at least 40.
- Validates required fields and marks from 0 to 100.
- Saves, lists, and deletes student records using the browser's IndexedDB database.
- Keeps records between visits in the same browser without a server or account.
- Moves existing records from the previous `localStorage` version into IndexedDB the first time the updated app is opened.
- Can clear all saved records.
- Responsive layout for desktop and mobile screens.
- No server, build tools, or external libraries required.

## Technologies used

- HTML
- CSS
- Vanilla JavaScript
- Browser IndexedDB

## How to run the project

1. Download or clone this project folder.
2. Open `index.html` in a modern web browser.
3. Enter the student details and marks, then select **Calculate Result**.
4. Select **Save Result** to keep the result in this browser's database.

Saved records are stored locally in IndexedDB in the browser that opened the page. They are not shared with other devices or browsers. Clearing browser site data can remove these records. This project does not send data to an online database or server.

## Deploy using GitHub Pages

1. Create a GitHub repository and add `index.html`, `style.css`, `script.js`, and `README.md` to its root.
2. Push the files to the repository's default branch.
3. Open the repository on GitHub and go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the default branch and the `/(root)` folder, then select **Save**.
6. Wait for GitHub Pages to publish the site. Open the URL shown in the Pages settings.

Because this project uses only static HTML, CSS, and JavaScript, no backend or build step is needed. GitHub Pages serves the app, while IndexedDB stores each visitor's records locally in that visitor's browser.
