import { HabitManager } from './habitManager.js';

export class Calendar {
  constructor(containerId, onDayClick) {
    this.container = document.getElementById(containerId);
    this.monthYearEl = document.getElementById('month-year');
    this.dayNamesContainer = document.querySelector('.calendar_day-names');
    this.daysContainer = document.getElementById('calendar-days');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.onDayClick = onDayClick;

    this.currentDate = new Date();
    this.habitManager = new HabitManager()

    this.init();
  }

  init() {
    this.renderDayNames();
    this.renderCalendar();
    this.bindEvents();
  }

  renderDayNames() {
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    this.dayNamesContainer.innerHTML = dayNames.map(d => `<span>${d}</span>`).join('');
  }

  renderCalendar() {
    this.habitManager.reload();

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    this.monthYearEl.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = (firstDay - 1 + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // Собираем все даты с выполненными привычками
    const completedDays = new Set();
    this.habitManager.habits.forEach(h => {
      h.completedDates.forEach(d => completedDays.add(d));
    });

    let html = '';
    for (let i = 0; i < adjustedFirstDay; i++) {
      html += '<span class="calendar_days-hidden"></span>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = day === todayDay && month === todayMonth && year === todayYear;
      const isCompleted = completedDays.has(dateStr);
      let cls = '';
      if (isToday) cls += ' today';
      if (isCompleted) cls += ' completed';
      html += `<span data-date="${dateStr}" class="${cls.trim()}">${day}</span>`;
    }
    this.daysContainer.innerHTML = html;
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendar();
    });
    this.nextBtn.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendar();
    });
    this.daysContainer.addEventListener('click', (e) => {
      const target = e.target.closest('span[data-date]');
      if (target && target.dataset.date) {
        this.onDayClick(target.dataset.date);
      }
    });
  }

  refresh() {
    this.renderCalendar();
  }
}
