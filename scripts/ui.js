import { HabitManager } from './habitManager.js';

export class UI {
  constructor() {
    this.habitManager = new HabitManager();
    this.habitsList = document.getElementById('habitsList');
    this.popup = document.getElementById('popup');
    this.overlay = document.getElementById('overlay');
    this.closePopup = document.getElementById('closePopup');
    this.selectedDateSpan = document.getElementById('selectedDate');
    this.saveBtn = document.getElementById('saveBtn');
    this.habitNameInput = document.getElementById('habitName');
    this.habitTimeInput = document.getElementById('habitTime');
    this.repeatTypeSelect = document.getElementById('repeatType');
    this.intervalGroup = document.getElementById('intervalGroup');
    this.weekdaysGroup = document.getElementById('weekdaysGroup');
    this.intervalValueInput = document.getElementById('intervalValue');
    this.intervalUnitSelect = document.getElementById('intervalUnit');
    this.reminderCountSelect = document.getElementById('reminderCount');
    this.reminderBeforeSelect = document.getElementById('reminderBefore');

    this._currentDate = null;
    this._editingId = null;

    this.init();
  }

  init() {
    this.renderHabits();
    this.renderChart('week');
    this.bindEvents();
    this._bindStatsTabs();
  }

  renderHabits() {
    this.habitManager.reload();
    const allHabits = this.habitManager.habits;
    // Одноразовые выполненные привычки скрываются из списка
    const habits = allHabits.filter(h => {
      if ((h.repeatType || 'once') === 'once' && h.completedDates.length > 0) return false;
      return true;
    });
    this.habitsList.innerHTML = '';

    if (habits.length === 0 && allHabits.length === 0) {
      this.habitsList.innerHTML = '<li class="habit-empty">Нажмите на день в календаре, чтобы добавить привычку</li>';
    } else if (habits.length === 0) {
      this.habitsList.innerHTML = '<li class="habit-empty">Все привычки выполнены!</li>';
    }

    const today = new Date().toISOString().split('T')[0];

    habits.forEach(habit => {
      const stats = this.habitManager.getStats(habit.id);
      const li = document.createElement('li');
      li.className = 'habit-item';
      li.dataset.id = habit.id;

      const info = document.createElement('div');
      info.className = 'habit-info';

      const scheduleText = this._getScheduleText(habit);

      info.innerHTML = `
        <strong>${this._escapeHtml(habit.name)}</strong>
        ${habit.time ? `<span class="habit-time">${this._escapeHtml(habit.time)}</span>` : ''}
        ${scheduleText ? `<div class="habit-schedule-info">${scheduleText}</div>` : ''}
        <div class="habit-stats">
          <span>Неделя: ${stats ? Math.round(stats.weekPercent) : 0}%</span>
          <span>Месяц: ${stats ? Math.round(stats.monthPercent) : 0}%</span>
          <span>Серия: ${stats ? stats.streak : 0} дн.</span>
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'habit-actions';

      const isActiveToday = this._isHabitActiveToday(habit, today);
      const isCompletedToday = habit.completedDates.includes(today);

      const completeBtn = document.createElement('button');
      if (isCompletedToday) {
        completeBtn.textContent = 'Отменить';
        completeBtn.className = 'complete-btn completed';
      } else if (isActiveToday) {
        completeBtn.textContent = 'Выполнено';
        completeBtn.className = 'complete-btn';
      } else {
        completeBtn.textContent = 'Не сегодня';
        completeBtn.className = 'complete-btn disabled';
        completeBtn.disabled = true;
      }
      completeBtn.addEventListener('click', () => {
        if (!isActiveToday && !isCompletedToday) return;
        this.habitManager.toggleCompletion(habit.id, today);
        this.refreshAll();
      });

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.title = 'Редактировать';
      editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
      editBtn.addEventListener('click', () => {
        this._openEditPopup(habit.id);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.title = 'Удалить';
      deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Удалить привычку "${habit.name}"?`)) {
          this.habitManager.deleteHabit(habit.id);
          this.refreshAll();
        }
      });

      actions.append(completeBtn, editBtn, deleteBtn);
      li.append(info, actions);
      this.habitsList.appendChild(li);
    });

    this.renderTopHabits();
  }

  _isHabitActiveToday(habit, today) {
    const repeat = habit.repeatType || 'once';
    const created = habit.createdDate;

    if (repeat === 'once') {
      return today === created;
    }
    if (repeat === 'daily') {
      return today >= created;
    }
    if (repeat === 'weekly') {
      if (today < created) return false;
      const createdDay = new Date(created).getDay();
      const todayDay = new Date(today).getDay();
      return createdDay === todayDay;
    }
    if (repeat === 'custom') {
      if (today < created) return false;
      const weekdays = habit.weekdays || [];
      const todayDay = new Date(today).getDay();
      return weekdays.includes(todayDay);
    }
    if (repeat === 'interval') {
      if (today < created) return false;
      const diffMs = new Date(today) - new Date(created);
      const diffDays = Math.round(diffMs / 86400000);
      let intervalDays = habit.intervalValue || 1;
      const unit = habit.intervalUnit || 'days';
      if (unit === 'weeks') intervalDays *= 7;
      if (unit === 'months') intervalDays *= 30;
      return diffDays % intervalDays === 0;
    }
    return false;
  }

  _getScheduleText(habit) {
    const repeat = habit.repeatType || 'once';
    if (repeat === 'once') return '';
    if (repeat === 'daily') return 'Каждый день';
    if (repeat === 'weekly') return 'Еженедельно';
    if (repeat === 'custom') {
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const days = (habit.weekdays || []).map(d => dayNames[d]).join(', ');
      return days ? `Дни: ${days}` : '';
    }
    if (repeat === 'interval') {
      const val = habit.intervalValue || 1;
      const unit = habit.intervalUnit || 'days';
      const unitNames = { days: 'дн.', weeks: 'нед.', months: 'мес.' };
      return `Каждые ${val} ${unitNames[unit] || unit}`;
    }
    return '';
  }

  renderTopHabits() {
    const container = document.getElementById('topHabits');
    if (!container) return;
    const top = this.habitManager.getTopHabits(3);
    container.innerHTML = '<h3>Топ-3 привычек</h3>';
    if (top.length === 0) {
      container.innerHTML += '<p style="opacity:0.7;font-size:14px;">Нет данных</p>';
      return;
    }
    const list = document.createElement('ol');
    top.forEach(h => {
      const li = document.createElement('li');
      li.textContent = `${h.name} – ${Math.round(h.stats.totalPercent)}%`;
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  // --- Stats Chart ---
  renderChart(period = 'week') {
    const chart = document.getElementById('statsChart');
    if (!chart) return;
    this.habitManager.reload();
    const allHabits = this.habitManager.habits;
    const today = new Date();

    let labels = [];
    let data = [];

    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        labels.push(dayNames[d.getDay()]);
        const total = allHabits.length || 1;
        const completed = allHabits.filter(h => h.completedDates.includes(dateStr)).length;
        data.push(Math.round((completed / total) * 100));
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i -= 3) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(`${d.getDate()}`);
        const total = allHabits.length || 1;
        const completed = allHabits.filter(h => h.completedDates.includes(dateStr)).length;
        data.push(Math.round((completed / total) * 100));
      }
    } else if (period === 'year') {
      const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(monthNames[d.getMonth()]);
        let completedDays = 0;
        let totalDays = 0;
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
          if (new Date(dateStr) > today) break;
          totalDays++;
          const completed = allHabits.filter(h => h.completedDates.includes(dateStr)).length;
          if (completed > 0) completedDays++;
        }
        data.push(totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0);
      }
    }

    const maxVal = Math.max(...data, 1);
    chart.innerHTML = data.map((val, i) => `
      <div class="chart-bar-wrapper">
        <span class="chart-bar-value">${val}%</span>
        <div class="chart-bar" style="height: ${Math.max(2, (val / 100) * 110)}px"></div>
        <span class="chart-bar-label">${labels[i]}</span>
      </div>
    `).join('');
  }

  _openEditPopup(id) {
    const habit = this.habitManager.habits.find(h => h.id === id);
    if (!habit) return;
    this._editingId = id;
    this.habitNameInput.value = habit.name;
    this.habitTimeInput.value = habit.time || '';
    this.repeatTypeSelect.value = habit.repeatType || 'once';
    this._toggleScheduleFields();

    if (habit.intervalValue) this.intervalValueInput.value = habit.intervalValue;
    if (habit.intervalUnit) this.intervalUnitSelect.value = habit.intervalUnit;
    if (habit.weekdays) {
      const checkboxes = this.weekdaysGroup.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = habit.weekdays.includes(parseInt(cb.value));
      });
    }
    this.reminderCountSelect.value = habit.reminderCount || 0;
    this.reminderBeforeSelect.value = habit.reminderBefore || 5;

    this.selectedDateSpan.textContent = 'Редактирование';
    document.querySelector('.popup-title').textContent = 'Редактировать';
    this.saveBtn.textContent = 'Сохранить';
    this._showPopup();
  }

  _showPopup() {
    this.popup.style.display = 'block';
    this.overlay.style.display = 'block';
    requestAnimationFrame(() => {
      this.popup.classList.add('popup-visible');
      this.overlay.classList.add('overlay-visible');
    });
    this.habitNameInput.focus();
  }

  _hidePopup() {
    this.popup.classList.remove('popup-visible');
    this.overlay.classList.remove('overlay-visible');
    setTimeout(() => {
      this.popup.style.display = 'none';
      this.overlay.style.display = 'none';
    }, 250);
    this._editingId = null;
    this.saveBtn.textContent = 'Сохранить';
    document.querySelector('.popup-title').textContent = 'Новая привычка';
    this.habitNameInput.value = '';
    this.habitTimeInput.value = '';
    this.repeatTypeSelect.value = 'once';
    this.reminderCountSelect.value = '1';
    this.reminderBeforeSelect.value = '5';
    this.intervalValueInput.value = '2';
    this.intervalUnitSelect.value = 'days';
    const checkboxes = this.weekdaysGroup.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    this._toggleScheduleFields();
  }

  _toggleScheduleFields() {
    const type = this.repeatTypeSelect.value;
    this.intervalGroup.style.display = type === 'interval' ? 'flex' : 'none';
    this.weekdaysGroup.style.display = type === 'custom' ? 'flex' : 'none';
  }

  bindEvents() {
    this.closePopup.addEventListener('click', () => this._hidePopup());
    this.overlay.addEventListener('click', () => this._hidePopup());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup.style.display === 'block') {
        this._hidePopup();
      }
    });

    this.saveBtn.addEventListener('click', () => this._handleSave());
    this.habitNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSave();
    });

    this.repeatTypeSelect.addEventListener('change', () => this._toggleScheduleFields());

    const resetBtn = document.getElementById('resetStatsBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Сбросить всю статистику выполнения?')) {
          this.habitManager.resetAllStats();
          this.refreshAll();
        }
      });
    }

    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCSV());
    }
  }

  _handleSave() {
    const name = this.habitNameInput.value.trim();
    const time = this.habitTimeInput.value;
    const repeatType = this.repeatTypeSelect.value;
    const reminderCount = parseInt(this.reminderCountSelect.value);
    const reminderBefore = parseInt(this.reminderBeforeSelect.value);

    if (!name) {
      this.habitNameInput.classList.add('input-error');
      setTimeout(() => this.habitNameInput.classList.remove('input-error'), 1500);
      return;
    }

    let weekdays = [];
    if (repeatType === 'custom') {
      const checkboxes = this.weekdaysGroup.querySelectorAll('input[type="checkbox"]:checked');
      weekdays = Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    const intervalValue = parseInt(this.intervalValueInput.value) || 2;
    const intervalUnit = this.intervalUnitSelect.value;

    try {
      if (this._editingId) {
        this.habitManager.updateHabit(this._editingId, {
          name, time, repeatType, weekdays,
          intervalValue, intervalUnit,
          reminderCount, reminderBefore
        });
      } else {
        const selectedDate = this._currentDate;
        this.habitManager.addHabit(name, time, selectedDate, {
          repeatType, weekdays, intervalValue, intervalUnit,
          reminderCount, reminderBefore
        });
      }
      this._hidePopup();
      this.refreshAll();
    } catch (err) {
      alert(err.message);
    }
  }

  onDaySelected(date) {
    this._currentDate = date;
    this.selectedDateSpan.textContent = this._formatDateDisplay(date);
    this.habitNameInput.value = '';
    this.habitTimeInput.value = '';
    this.repeatTypeSelect.value = 'once';
    this.reminderCountSelect.value = '1';
    this.reminderBeforeSelect.value = '5';
    this._toggleScheduleFields();
    this._editingId = null;
    document.querySelector('.popup-title').textContent = 'Новая привычка';
    this.saveBtn.textContent = 'Сохранить';
    this._showPopup();
  }

  _formatDateDisplay(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  _bindStatsTabs() {
    const tabs = document.querySelectorAll('.stats-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderChart(tab.dataset.period);
      });
    });
  }

  refreshAll() {
    this.habitManager.reload();
    this.renderHabits();
    this.renderChart(document.querySelector('.stats-tab.active')?.dataset.period || 'week');
    window.dispatchEvent(new CustomEvent('refreshCalendar'));
  }

  exportCSV() {
    const habits = this.habitManager.habits;
    if (habits.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }
    const BOM = '\uFEFF';
    let csv = 'Привычка;Время;Создана;Выполнено дней;Процент\n';
    habits.forEach(h => {
      const stats = this.habitManager.getStats(h.id);
      const percent = stats ? Math.round(stats.totalPercent) : 0;
      const safeName = h.name.replace(/"/g, '""');
      const safeTime = (h.time || '').replace(/"/g, '""');
      csv += `"${safeName}";"${safeTime}";"${h.createdDate}";${h.completedDates.length};${percent}%\n`;
    });
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'habits_stat.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
