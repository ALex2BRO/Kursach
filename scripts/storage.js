// Модуль хранения данных (localStorage)
export const Storage = {
  getHabits() {
    const stored = localStorage.getItem('habits');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  saveHabits(habits) {
    localStorage.setItem('habits', JSON.stringify(habits));
  }
};
