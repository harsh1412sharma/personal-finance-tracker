// Previous working JavaScript code

const form = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");
const incomeBtn = document.getElementById("add-income");
const expenseBtn = document.getElementById("add-expense");
const monthSelector = document.getElementById("month");

const incomeList = document.getElementById("income-list");
const expenseList = document.getElementById("expense-list");
const incomeTotalDisplay = document.getElementById("income-total");
const expenseTotalDisplay = document.getElementById("expense-total");
const netBalanceDisplay = document.getElementById("net-balance");

let transactionType = "income";
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let editingId = null;

dateInput.addEventListener("change", () => {
  const month = dateInput.value.split("-")[1];
  if (month) monthSelector.value = month;
});

incomeBtn.addEventListener("click", () => {
  transactionType = "income";
  incomeBtn.classList.add("active");
  expenseBtn.classList.remove("active");
});

expenseBtn.addEventListener("click", () => {
  transactionType = "expense";
  expenseBtn.classList.add("active");
  incomeBtn.classList.remove("active");
});

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const description = descriptionInput.value.trim();
  const amount = Math.abs(parseFloat(amountInput.value));
  const date = dateInput.value;

  if (!description || isNaN(amount) || !date) return;

  if (editingId) {
    transactions = transactions.map(tx =>
      tx.id === editingId
        ? { ...tx, description, amount: transactionType === "expense" ? -amount : amount, date, type: transactionType }
        : tx
    );
    editingId = null;
  } else {
    transactions.push({
      id: Date.now(),
      description,
      amount: transactionType === "expense" ? -amount : amount,
      date,
      type: transactionType
    });
  }

  saveAndRender();
  form.reset();
});

function saveAndRender() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  renderTransactions();
  updateSummary();
  updateChart();
}

function renderTransactions() {
  incomeList.innerHTML = "";
  expenseList.innerHTML = "";

  const month = monthSelector.value;

  const filtered = transactions.filter(tx => {
    if (!tx.date) return false;
    const parts = tx.date.split("-");
    return parts[1] === month;
  });

  filtered.forEach(tx => {
    const li = document.createElement("li");
    const sign = tx.amount > 0 ? "➕" : "➖";
    li.innerHTML = `
      ${sign} ${tx.description} - ₹${Math.abs(tx.amount)} on ${tx.date}
      <span class="actions">
        <button onclick="editTransaction(${tx.id})">✏️</button>
        <button onclick="deleteTransaction(${tx.id})">❌</button>
      </span>
    `;
    if (tx.amount > 0) {
      incomeList.appendChild(li);
    } else {
      expenseList.appendChild(li);
    }
  });
}

window.editTransaction = function (id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;
  descriptionInput.value = tx.description;
  amountInput.value = Math.abs(tx.amount);
  dateInput.value = tx.date;
  transactionType = tx.amount < 0 ? "expense" : "income";

  incomeBtn.classList.toggle("active", transactionType === "income");
  expenseBtn.classList.toggle("active", transactionType === "expense");

  editingId = id;
};

window.deleteTransaction = function (id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveAndRender();
};

function updateSummary() {
  const month = monthSelector.value;
  const filtered = transactions.filter(tx => tx.date && tx.date.split("-")[1] === month);
  const income = filtered.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const expense = filtered.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0);
  incomeTotalDisplay.textContent = income.toFixed(2);
  expenseTotalDisplay.textContent = Math.abs(expense).toFixed(2);
  netBalanceDisplay.textContent = (income + expense).toFixed(2);
}

let pieChart;
function updateChart() {
  const ctx = document.getElementById("chart").getContext("2d");
  const month = monthSelector.value;
  const filtered = transactions.filter(tx => tx.amount < 0 && tx.date && tx.date.split("-")[1] === month);

  const categoryTotals = {};
  filtered.forEach(tx => {
    const category = tx.description.split(" ")[0];
    categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(tx.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#ff7675', '#74b9ff', '#ffeaa7', '#55efc4', '#a29bfe']
      }]
    }
  });
}

monthSelector.addEventListener("change", saveAndRender);
saveAndRender();
document.getElementById("export-pdf").addEventListener("click", () => {
  const stored = JSON.parse(localStorage.getItem("transactions")) || [];
  if (!stored.length) return alert("No transactions to export!");

  const selectedMonth = document.getElementById("month").value;
  const filtered = stored.filter(tr => new Date(tr.date).getMonth() + 1 === +selectedMonth);

  const rows = filtered.map((tr, index) => [
  index + 1,
  tr.date,
  tr.description,
  Number(tr.amount).toLocaleString(),
  tr.amount >= 0 ? "Income" : "Expense"
]);



  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("Personal Finance Tracker - Transactions", 14, 15);
  doc.autoTable({
    head: [["#", "Date", "Description", "Amount", "Type"]],
    body: rows,
    startY: 20,
  });

  doc.save(`Finance_Transactions_${selectedMonth}.pdf`);
});

