# Bibliotecas Externas e Dependências

O componente `calendarioReino` depende de várias bibliotecas JavaScript externas para sua funcionalidade principal. Elas são carregadas como recursos estáticos (`staticresources`) e inicializadas sequencialmente.

1.  **FullCalendar v3.10.0**
    *   **Função:** Biblioteca principal para a renderização e interatividade do calendário.
    *   **Dependências:** Carrega `jquery-3.6.0.min.js` e `moment.min.js` antes de si mesma.
    *   **Arquivos:** `fullcalendar.min.js`, `fullcalendar.min.css`, e `pt-br.js` para localização em português.

2.  **Floating UI (@floating-ui/dom)**
    *   **Função:** Usada para o posicionamento dinâmico e inteligente de elementos flutuantes, como os modais (seletor de cores de evento e modal de criação rápida de compromisso).
    *   **Carregamento:** Carregada a partir de um recurso estático (`FloatingUIDOM_Zip`).

3.  **jQuery v3.6.0**
    *   **Função:** Dependência legada requerida pelo FullCalendar v3.

4.  **Moment.js**
    *   **Função:** Dependência do FullCalendar v3, usada para manipulação robusta de datas e horas.
