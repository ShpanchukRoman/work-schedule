document.addEventListener('DOMContentLoaded', function() {
    // Ініціалізація додатку
    initApp();
});

function initApp() {
    // Встановлюємо поточний тиждень
    setCurrentWeek();
    
    // Додаємо обробники подій
    setupEventListeners();
    
    // Завантажуємо збережені дані
    loadSavedData();
    
    // Оновлюємо дати тижня
    updateWeekDates();
    
    // Розраховуємо години
    calculateAllHours();
}

// Збереження даних
function saveData() {
    const data = {
        employees: getEmployeesData(),
        week: document.getElementById('week').value,
        limits: getLimitsData()
    };
    localStorage.setItem('workScheduleData', JSON.stringify(data));
}

function loadSavedData() {
    const savedData = localStorage.getItem('workScheduleData');
    if (savedData) {
        const data = JSON.parse(savedData);
        
        // Відновлюємо вибраний тиждень
        document.getElementById('week').value = data.week;
        
        // Відновлюємо ліміти
        if (data.limits) {
            setLimitsData(data.limits);
        }
        
        // Відновлюємо працівників
        if (data.employees && data.employees.length > 0) {
            clearAllEmployees();
            data.employees.forEach(emp => {
                addEmployee(emp.name, emp.schedule, false);
            });
        }
    } else {
        // Якщо немає збережених даних - додаємо приклад працівників
        addExampleEmployees();
    }
}

function getEmployeesData() {
    const employees = [];
    document.querySelectorAll('.employee-row').forEach(row => {
        const name = row.querySelector('.employee-name').textContent;
        const schedule = [];
        row.querySelectorAll('.time-input').forEach(input => {
            schedule.push(input.value);
        });
        employees.push({ name, schedule });
    });
    return employees;
}

function getLimitsData() {
    const limits = [];
    document.querySelectorAll('.day-limit-input').forEach(input => {
        limits.push(input.value);
    });
    return limits;
}

function setLimitsData(limits) {
    document.querySelectorAll('.day-limit-input').forEach((input, index) => {
        input.value = limits[index] || input.value;
    });
}

function clearAllEmployees() {
    document.getElementById('employees-container').innerHTML = '';
}

function setCurrentWeek() {
    const weekInput = document.getElementById('week');
    const savedWeek = localStorage.getItem('workScheduleWeek');
    if (savedWeek) {
        weekInput.value = savedWeek;
    } else {
        const today = new Date();
        const year = today.getFullYear();
        const weekNum = getWeekNumber(today)[1];
        const weekString = `${year}-W${weekNum.toString().padStart(2, '0')}`;
        weekInput.value = weekString;
    }
}

function setupEventListeners() {
    // Кнопки управління
    document.getElementById('add-employee-btn').addEventListener('click', addNewEmployee);
    document.getElementById('clear-schedule').addEventListener('click', clearSchedule);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
    document.getElementById('export-jpg').addEventListener('click', exportToJPG);
    
    // Вибір тижня
    document.getElementById('week').addEventListener('change', function() {
        updateWeekDates();
        saveData();
    });
    
    // Ліміти годин
    document.querySelectorAll('.day-limit-input').forEach(input => {
        input.addEventListener('change', function() {
            calculateUsedHours();
            saveData();
        });
    });
}

function addExampleEmployees() {
    
    saveData();
}

// Функції для роботи з тижнями
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return [d.getUTCFullYear(), weekNo];
}

function updateWeekDates() {
    const weekInput = document.getElementById('week');
    const [year, week] = weekInput.value.split('-W');
    
    const date = new Date(year, 0, 1);
    const dayNum = date.getDay();
    const dayDiff = (dayNum <= 4) ? 1 - dayNum : 8 - dayNum;
    date.setDate(date.getDate() + dayDiff + (week - 1) * 7);
    
    const dayCells = document.querySelectorAll('.table-header .day-cell');
    const months = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(date);
        currentDate.setDate(date.getDate() + i);
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = months[currentDate.getMonth()];
        dayCells[i].textContent = `${day}.${month}`;
    }
}

// Функції для роботи з працівниками
function addNewEmployee() {
    const name = prompt('Введіть ім\'я працівника:');
    if (name) {
        addEmployee(name, Array(7).fill(''), true);
    }
}

function addEmployee(name, schedule, shouldSave = true) {
    const container = document.getElementById('employees-container');
    const employeeRow = document.createElement('div');
    employeeRow.className = 'employee-row';
    
    // Створення комірки з ім'ям
    const labelCell = createNameCell(name);
    employeeRow.appendChild(labelCell);
    
    // Створення комірок з графіком
    for (let i = 0; i < 7; i++) {
        const dayCell = createDayCell(schedule[i]);
        employeeRow.appendChild(dayCell);
    }
    
    // Додавання комірки з загальною кількістю годин
    const totalCell = createTotalCell();
    employeeRow.appendChild(totalCell);
    
    container.appendChild(employeeRow);
    calculateAllHours();
    
    if (shouldSave) {
        saveData();
    }
}

function createNameCell(name) {
    const labelCell = document.createElement('div');
    labelCell.className = 'label-cell';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'employee-name';
    nameSpan.textContent = name;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-employee';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', function() {
        this.closest('.employee-row').remove();
        calculateAllHours();
        saveData();
    });
    
    labelCell.appendChild(nameSpan);
    labelCell.appendChild(deleteBtn);
    
    return labelCell;
}

function createDayCell(scheduleValue) {
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';
    
    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.className = 'time-input';
    timeInput.placeholder = '8 - 21';
    timeInput.value = scheduleValue || '';
    
    // Встановлюємо placeholder "вихідний" для порожнього поля
    if (!scheduleValue) {
        timeInput.placeholder = 'вихідний';
    }
    
    timeInput.addEventListener('focus', function() {
        if (this.value === '' && this.placeholder === 'вихідний') {
            this.placeholder = '8 - 21';
        }
    });
    
    timeInput.addEventListener('blur', function() {
        if (this.value === '') {
            this.placeholder = 'вихідний';
        }
    });
    
    timeInput.addEventListener('change', function() {
        if (validateTimeInput(this)) {
            calculateAllHours();
            saveData();
        }
        if (this.value === '') {
            this.placeholder = 'вихідний';
        }
    });
    
    dayCell.appendChild(timeInput);
    return dayCell;
}

function createTotalCell() {
    const totalCell = document.createElement('div');
    totalCell.className = 'total-cell';
    totalCell.textContent = '0';
    return totalCell;
}

function clearSchedule() {
    if (confirm('Ви впевнені, що хочете очистити графік всіх працівників?')) {
        document.querySelectorAll('.employee-row .time-input').forEach(input => {
            input.value = '';
            input.placeholder = 'вихідний';
            input.dispatchEvent(new Event('change'));
        });
        saveData();
    }
}

// Валідація та розрахунки
function validateTimeInput(input) {
    const value = input.value.trim();
    if (value === '') return true;
    
    const pattern = /^(\d{1,2})\s*-\s*(\d{1,2})$/;
    const match = value.match(pattern);
    
    if (!match) {
        alert('Невірний формат часу. Використовуйте формат "8 - 21" або "14 - 18"');
        input.value = '';
        input.placeholder = 'вихідний';
        return false;
    }
    
    const startHour = parseInt(match[1]);
    const endHour = parseInt(match[2]);
    
    if (isNaN(startHour) || isNaN(endHour) || 
        startHour < 0 || startHour > 23 || 
        endHour < 0 || endHour > 23) {
        alert('Години повинні бути в діапазоні від 0 до 23');
        input.value = '';
        input.placeholder = 'вихідний';
        return false;
    }
    
    input.value = `${startHour} - ${endHour}`;
    return true;
}

function calculateAllHours() {
    calculateEmployeeHours();
    calculateUsedHours();
}

function calculateEmployeeHours() {
    document.querySelectorAll('.employee-row').forEach(row => {
        const inputs = row.querySelectorAll('.time-input');
        let totalHours = 0;
        
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value === '') return;
            
            const [start, end] = value.split('-').map(s => parseInt(s.trim()));
            let hours = end - start;
            if (hours < 0) hours += 24;
            
            totalHours += hours;
        });
        
        row.querySelector('.total-cell').textContent = totalHours;
    });
}

function calculateUsedHours() {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayLimitInputs = document.querySelectorAll('.day-limit-input');
    const dayLimits = Array.from(dayLimitInputs).map(input => parseInt(input.value) || 0);
    const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота', 'Неділя'];
    const dateCells = document.querySelectorAll('.table-header .day-cell');
    
    // Розраховуємо суму годин по дням
    document.querySelectorAll('.employee-row').forEach(row => {
        const inputs = row.querySelectorAll('.time-input');
        
        inputs.forEach((input, index) => {
            const value = input.value.trim();
            if (value === '') return;
            
            const [start, end] = value.split('-').map(s => parseInt(s.trim()));
            let hours = end - start;
            if (hours < 0) hours += 24;
            dayTotals[index] += hours;
        });
    });
    
    // Оновлюємо рядок з використаними годинами
    updateUsedHoursRow(dayTotals, dayLimits, dayNames, dateCells);
}

function updateUsedHoursRow(dayTotals, dayLimits, dayNames, dateCells) {
    const usedHoursRow = document.querySelector('.used-hours-row');
    const dayCells = usedHoursRow.querySelectorAll('.day-cell');
    let weekTotal = 0;
    let notificationMessages = [];
    
    dayTotals.forEach((total, index) => {
        dayCells[index].textContent = total;
        weekTotal += total;
        
        // Перевіряємо перевищення ліміту
        if (total > dayLimits[index]) {
            dayCells[index].classList.add('limit-exceeded');
            notificationMessages.push(
                `Переліміт на ${dayNames[index]} (${dateCells[index].textContent}) на ${total - dayLimits[index]} год.`
            );
        } else {
            dayCells[index].classList.remove('limit-exceeded');
        }
    });
    
    usedHoursRow.querySelector('.total-cell').textContent = weekTotal;
    
    // Показуємо сповіщення про перевищення лімітів
    if (notificationMessages.length > 0) {
        showNotification(notificationMessages.join('\n'));
    } else {
        hideNotification();
    }
}

// Сповіщення
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(hideNotification, 5000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.style.display = 'none';
}

// Експорт
function exportToPDF() {
    const element = document.querySelector('.container');
    const opt = {
        margin: 10,
        filename: 'work_schedule.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    toggleControlsVisibility(true);
    html2pdf().from(element).set(opt).save().then(() => {
        toggleControlsVisibility(false);
    });
}

function exportToJPG() {
    const element = document.querySelector('.container');
    
    toggleControlsVisibility(true);
    html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
    }).then(canvas => {
        toggleControlsVisibility(false);
        downloadImage(canvas);
    });
}

function toggleControlsVisibility(hide) {
    const controls = document.querySelector('.controls');
    controls.style.display = hide ? 'none' : 'flex';
}

function downloadImage(canvas) {
    const link = document.createElement('a');
    link.download = 'work_schedule.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
}
