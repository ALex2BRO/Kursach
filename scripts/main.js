import { Calendar } from './calendar.js';
import { UI } from './ui.js';
import { NotificationManager } from './notifications.js';

document.addEventListener('DOMContentLoaded', () => {
  const ui = new UI();

  const calendar = new Calendar('calendar-wrapper', (date) => {
    ui.onDaySelected(date);
  });

  window.addEventListener('refreshCalendar', () => {
    calendar.refresh();
  });

  // Уведомления о привычках
  const notifications = new NotificationManager();

  // Переключение темы
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const updateThemeIcon = () => {
      const isDark = document.body.classList.contains('dark-mode');
      themeToggle.textContent = isDark ? '☀️' : '🌙';
    };

    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
      updateThemeIcon();
    });

    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
    }
    updateThemeIcon();
  }
});
