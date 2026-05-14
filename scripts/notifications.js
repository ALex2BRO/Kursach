import { HabitManager } from './habitManager.js';

export class NotificationManager {
  constructor() {
    this.habitManager = new HabitManager();
    this._sentReminders = {};
    this._checkInterval = null;
    this._container = document.getElementById('toastContainer');
    this.init();
  }

  init() {
    this._startChecking();
  }

  _startChecking() {
    this._checkInterval = setInterval(() => this._checkUpcoming(), 10000);
    setTimeout(() => this._checkUpcoming(), 3000);
  }

  _checkUpcoming() {
    this.habitManager.reload();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    this.habitManager.habits.forEach(habit => {
      if (!habit.time) return;
      if ((habit.reminderCount || 0) === 0) return;

      // Проверяем что привычка активна сегодня
      if (!this._isActiveToday(habit, todayStr)) return;

      // Если уже выполнена — не напоминаем
      if (habit.completedDates.includes(todayStr)) return;

      const [hours, minutes] = habit.time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return;

      const habitTime = new Date();
      habitTime.setHours(hours, minutes, 0, 0);

      const reminderBefore = (habit.reminderBefore || 5) * 60000;
      const reminderCount = habit.reminderCount || 1;

      const sentKey = `${habit.id}-${todayStr}`;
      const alreadySent = this._sentReminders[sentKey] || 0;

      if (alreadySent >= reminderCount) return;

      // Первое напоминание за reminderBefore до начала
      // Остальные — каждые 2 минуты после
      const firstReminderTime = habitTime.getTime() - reminderBefore;
      const targetTime = firstReminderTime + (alreadySent * 120000);

      const diff = now.getTime() - targetTime;

      if (diff >= 0 && diff < 15000) {
        this._showToast(habit, alreadySent + 1, reminderCount);
        this._sentReminders[sentKey] = alreadySent + 1;
      }
    });
  }

  _isActiveToday(habit, today) {
    const repeat = habit.repeatType || 'once';
    const created = habit.createdDate;

    if (repeat === 'once') return today === created;
    if (repeat === 'daily') return today >= created;
    if (repeat === 'weekly') {
      if (today < created) return false;
      return new Date(created).getDay() === new Date(today).getDay();
    }
    if (repeat === 'custom') {
      if (today < created) return false;
      return (habit.weekdays || []).includes(new Date(today).getDay());
    }
    if (repeat === 'interval') {
      if (today < created) return false;
      const diffDays = Math.round((new Date(today) - new Date(created)) / 86400000);
      let intervalDays = habit.intervalValue || 1;
      const unit = habit.intervalUnit || 'days';
      if (unit === 'weeks') intervalDays *= 7;
      if (unit === 'months') intervalDays *= 30;
      return diffDays % intervalDays === 0;
    }
    return false;
  }

  _showToast(habit, currentNum, totalNum) {
    if (!this._container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    const numText = totalNum > 1 ? ` (${currentNum}/${totalNum})` : '';

    toast.innerHTML = `
      <div class="toast-icon">🔔</div>
      <div class="toast-content">
        <div class="toast-title">Напоминание${numText}</div>
        <div class="toast-body">"${this._escapeHtml(habit.name)}" в ${habit.time}</div>
      </div>
      <button class="toast-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    });

    this._container.appendChild(toast);

    // Автоудаление через 15 секунд
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
      }
    }, 15000);

    // Звук (если поддерживается)
    this._playSound();
  }

  _playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio not supported
    }
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  destroy() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
    }
  }
}
