"use strict";

const DATABASE_NAME = "studentMarksCalculator";
const DATABASE_VERSION = 1;
const RECORDS_STORE = "students";
const LEGACY_STORAGE_KEY = "studentMarksCalculator.records";
// Keeping the subject list in one place makes validation and calculations consistent.
const SUBJECT_FIELDS = [
  { name: "English", id: "english" },
  { name: "Mathematics", id: "mathematics" },
  { name: "Computer Science", id: "computer-science" },
  { name: "Computer Networks", id: "computer-networks" },
  { name: "Database Management Systems", id: "database-management" }
];

const form = document.querySelector("#marks-form");
const formError = document.querySelector("#form-error");
const saveButton = document.querySelector("#save-result");
const resultSection = document.querySelector("#result-section");
const savedStudents = document.querySelector("#saved-students");
const emptyState = document.querySelector("#empty-state");
const storageMessage = document.querySelector("#storage-message");

let currentResult = null;
let database = null;
let databaseReady = false;
let records = [];

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearValidation();

  const validation = validateForm();
  if (!validation.valid) {
    validation.field.setAttribute("aria-invalid", "true");
    showFormError(validation.message);
    validation.field.focus();
    return;
  }

  currentResult = calculateResult(validation.student);
  displayResult(currentResult);
  saveButton.disabled = false;
});

form.addEventListener("input", () => {
  clearValidation();
  currentResult = null;
  saveButton.disabled = true;
  resultSection.hidden = true;
});

saveButton.addEventListener("click", async () => {
  if (!currentResult) {
    showFormError("Calculate a valid result before saving it.");
    return;
  }

  const record = { ...currentResult, id: createRecordId() };
  try {
    await putRecords([record]);
    records.push(record);
    renderRecords();
    setStorageMessage("Result saved in this browser's database.", "success");
    saveButton.disabled = true;
  } catch (error) {
    console.error("Unable to save the student record to IndexedDB.", error);
    setStorageMessage("Could not save the record to the browser database. Check browser storage availability.", "error");
  }
});

savedStudents.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-id]");
  if (!deleteButton) {
    return;
  }

  const recordId = deleteButton.dataset.deleteId;
  try {
    await deleteRecord(recordId);
    records = records.filter((record) => record.id !== recordId);
    renderRecords();
    setStorageMessage("Student record deleted.", "success");
  } catch (error) {
    console.error("Unable to delete the student record from IndexedDB.", error);
    setStorageMessage("Could not delete the record from the browser database.", "error");
  }
});

document.querySelector("#clear-records").addEventListener("click", async () => {
  if (records.length === 0) {
    setStorageMessage("There are no saved records to clear.", "info");
    return;
  }

  if (!window.confirm("Clear all saved student records? This cannot be undone.")) {
    return;
  }

  try {
    await clearRecords();
    records = [];
    renderRecords();
    setStorageMessage("All saved records have been cleared.", "success");
  } catch (error) {
    console.error("Unable to clear student records from IndexedDB.", error);
    setStorageMessage("Could not clear records from the browser database.", "error");
  }
});

function validateForm() {
  const studentNameInput = document.querySelector("#student-name");
  const registerNumberInput = document.querySelector("#register-number");
  const studentName = studentNameInput.value.trim();
  const registerNumber = registerNumberInput.value.trim();

  if (!studentName) {
    return { valid: false, field: studentNameInput, message: "Please enter the student's name." };
  }

  if (!registerNumber) {
    return { valid: false, field: registerNumberInput, message: "Please enter the register number." };
  }

  const marks = [];
  for (const subject of SUBJECT_FIELDS) {
    const field = document.querySelector(`#${subject.id}`);
    const mark = field.valueAsNumber;

    if (field.value.trim() === "" || !Number.isFinite(mark)) {
      return { valid: false, field, message: `Please enter marks for ${subject.name}.` };
    }

    if (!field.validity.valid || mark < 0 || mark > 100 || !Number.isInteger(mark)) {
      return {
        valid: false,
        field,
        message: `${subject.name} marks must be a whole number from 0 to 100.`
      };
    }

    marks.push(mark);
  }

  return {
    valid: true,
    student: { name: studentName, registerNumber, marks }
  };
}

function calculateResult(student) {
  const total = student.marks.reduce((sum, mark) => sum + mark, 0);
  const average = total / SUBJECT_FIELDS.length;
  const percentage = (total / (SUBJECT_FIELDS.length * 100)) * 100;

  return {
    name: student.name,
    registerNumber: student.registerNumber,
    total,
    average,
    percentage,
    grade: getGrade(percentage),
    // Passing is based on each subject, not just the overall average.
    result: student.marks.every((mark) => mark >= 40) ? "Pass" : "Fail"
  };
}

function getGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

function displayResult(result) {
  document.querySelector("#result-student").innerHTML =
    `<strong>${escapeHtml(result.name)}</strong> · Register No. ${escapeHtml(result.registerNumber)}`;
  document.querySelector("#total-marks").textContent = formatNumber(result.total);
  document.querySelector("#average-marks").textContent = formatNumber(result.average);
  document.querySelector("#percentage").textContent = `${formatNumber(result.percentage)}%`;
  document.querySelector("#grade").textContent = result.grade;

  const badge = document.querySelector("#result-badge");
  badge.textContent = result.result;
  badge.className = `result-badge ${result.result.toLowerCase()}`;
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderRecords() {
  savedStudents.replaceChildren();

  for (const record of records) {
    const row = document.createElement("tr");
    appendCell(row, record.name);
    appendCell(row, record.registerNumber);
    appendCell(row, `${formatNumber(record.total)} / 500`);
    appendCell(row, `${formatNumber(record.percentage)}%`);
    appendCell(row, record.grade);

    const resultCell = document.createElement("td");
    resultCell.className = `table-result ${record.result.toLowerCase()}`;
    resultCell.textContent = record.result;
    row.append(resultCell);

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.deleteId = record.id;
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete record for ${record.name}`);
    actionCell.append(deleteButton);
    row.append(actionCell);
    savedStudents.append(row);
  }

  emptyState.hidden = records.length > 0;
}

function appendCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.append(cell);
}

function isValidRecord(record) {
  return record !== null
    && typeof record === "object"
    && typeof record.id === "string"
    && typeof record.name === "string"
    && typeof record.registerNumber === "string"
    && Number.isFinite(record.total)
    && Number.isFinite(record.percentage)
    && ["A+", "A", "B", "C", "D", "F"].includes(record.grade)
    && ["Pass", "Fail"].includes(record.result);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("The browser database could not be opened."));
    request.onblocked = () => reject(new Error("The browser database is blocked by another open page."));
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("The browser database transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("The browser database transaction was cancelled."));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("The browser database request failed."));
  });
}

async function getAllRecords() {
  const transaction = database.transaction(RECORDS_STORE, "readonly");
  const done = transactionComplete(transaction);
  const result = await requestResult(transaction.objectStore(RECORDS_STORE).getAll());
  await done;
  return result;
}

async function putRecords(newRecords) {
  const transaction = database.transaction(RECORDS_STORE, "readwrite");
  const done = transactionComplete(transaction);
  const store = transaction.objectStore(RECORDS_STORE);
  for (const record of newRecords) {
    store.put(record);
  }
  await done;
}

async function deleteRecord(recordId) {
  const transaction = database.transaction(RECORDS_STORE, "readwrite");
  const done = transactionComplete(transaction);
  transaction.objectStore(RECORDS_STORE).delete(recordId);
  await done;
}

async function clearRecords() {
  const transaction = database.transaction(RECORDS_STORE, "readwrite");
  const done = transactionComplete(transaction);
  transaction.objectStore(RECORDS_STORE).clear();
  await done;
}

async function initializeDatabase() {
  setStorageMessage("Opening the browser database…", "info");

  try {
    if (!window.indexedDB) {
      throw new Error("IndexedDB is not available in this browser.");
    }

    database = await openDatabase();
    records = await getAllRecords();

    if (records.length === 0) {
      try {
        const legacyRecords = readLegacyRecords();
        if (legacyRecords.length > 0) {
          await putRecords(legacyRecords);
          records = legacyRecords;
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          setStorageMessage("Existing records were moved into the browser database.", "success");
        }
      } catch (error) {
        console.error("Unable to migrate existing local records to IndexedDB.", error);
        setStorageMessage("The database is ready, but existing browser records could not be migrated.", "error");
      }
    }

    databaseReady = true;
    saveButton.disabled = !currentResult;
    renderRecords();
    if (!storageMessage.classList.contains("error-message") && records.length === 0) {
      storageMessage.hidden = true;
    } else if (!storageMessage.classList.contains("error-message") && records.length > 0) {
      setStorageMessage("Records are stored in this browser's database.", "success");
    }
  } catch (error) {
    console.error("Unable to initialize the student records database.", error);
    setStorageMessage("Could not open the browser database. Saving and viewing records are unavailable.", "error");
    saveButton.disabled = true;
  }
}

function readLegacyRecords() {
  const storedRecords = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (storedRecords === null) {
    return [];
  }

  const parsedRecords = JSON.parse(storedRecords);
  if (!Array.isArray(parsedRecords) || !parsedRecords.every(isValidRecord)) {
    throw new Error("Existing saved data is not in the expected format.");
  }
  return parsedRecords;
}

function setStorageMessage(message, kind) {
  storageMessage.textContent = message;
  storageMessage.className = `message ${kind === "error" ? "error-message" : ""}`;
  storageMessage.hidden = false;
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearValidation() {
  formError.textContent = "";
  formError.hidden = true;
  for (const input of form.querySelectorAll("input")) {
    input.removeAttribute("aria-invalid");
  }
}

function formatNumber(number) {
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function createRecordId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

initializeDatabase();
