import { TabComponent } from './Tab.js';

const myTabs = new TabComponent('app-tabs');

myTabs
  .addOption({ id: 'estudiantes', label: 'Estudiantes' })
  .addOption({ id: 'aulas', label: 'Aulas' })
  .addOption({ id: 'profesores', label: 'Profesores' });

myTabs.addRow('estudiantes', {
  elements: [
    { type: 'span', text: 'Juan Pérez', class: 'student-name', style: { fontWeight: 600 } },
    { type: 'span', text: 'juan@email.com', class: 'student-email' }  ],
  style: { gap: '15px', padding: '12px', borderBottom: '1px solid #eee', alignItems: 'center' }
});

myTabs.addRow('estudiantes', {
  elements: [
    { type: 'span', text: 'María García', class: 'student-name', style: { fontWeight: 600 } },
    { type: 'span', text: 'maria@email.com', class: 'student-email' }
  ],
  style: { gap: '15px', padding: '12px', borderBottom: '1px solid #eee', alignItems: 'center' }
});

myTabs.addRow('aulas', {
  elements: [
    { type: 'span', text: 'Aula 101', class: 'aula-name', style: { fontWeight: 600 } },
    { type: 'span', text: 'Capacidad: 30', class: 'aula-capacity' },
  ],
  style: { gap: '15px', padding: '12px', borderBottom: '1px solid #eee', alignItems: 'center' }
});
