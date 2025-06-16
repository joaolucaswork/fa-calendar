# Análise do Código: calendarioReino.js (Linhas 0001-0400)

**Observações e Detalhes de Funções:**

*   **Importações:**
    *   LWC (`LightningElement`, `track`, `api`).
    *   Recursos Estáticos: `FullCalendarJS`, `FullCalendarCSS`, `Jquery`, `MomentJS`, `FloatingUIDOM_Zip`.
    *   Labels Customizadas: Diversas para internacionalização.
    *   Métodos Apex: `CalendarioController`, `AppointmentController`, e `EventUtils`.
    *   `ShowToastEvent` para notificações.

*   **Propriedades `@track` (Estado do Componente):**
    *   `events`, `allEvents`: Arrays para armazenar os eventos do calendário (filtrados e todos).
    *   `calendar`, `calendarInitialized`, `dependenciesLoaded`: Controle da inicialização do FullCalendar.
    *   `isLoading`, `errorLoading`: Indicadores de carregamento e erro.
    *   `sidebarVisible`, `sidebarMonth`, `sidebarYear`, `sidebarDays`: Estado da UI da sidebar.
    *   `selectedFilters`, `availableEventTypes`, `availableUsers`: Estado dos filtros.
    *   `showColorPicker`, `colorPickerEventId`, etc.: Estado do modal seletor de cores.
    *   `eventColorManager`: Instância para gerenciar a lógica de cores dos eventos.

*   **`constructor()`:**
    *   Inicializa `eventColorManager` com uma instância de `EventColorManager`, delegando a lógica de salvamento de cores para esta classe.

*   **`connectedCallback()`:**
    *   Inicia o carregamento de dependências (`loadDependenciesSequentially`).
    *   Configura um `setInterval` para auto-refresh.

*   **`disconnectedCallback()`:**
    *   Limpa o `setInterval` e outros listeners.

*   **`renderedCallback()`:**
    *   Lógica principal de inicialização. Executa uma vez após as dependências serem carregadas.
    *   Chama `initializeCalendarWithRetry()` para configurar o FullCalendar.

*   **`loadDependenciesSequentially()`:**
    *   Usa `Promise.all` para carregar jQuery, Moment.js, FullCalendar JS/CSS, e Floating UI DOM.

*   **`initializeCalendarWithRetry(attempt = 1)`:**
    *   Tenta inicializar o calendário, com até 3 retentativas em caso de falha.

*   **`initializeCalendar()`:**
    *   Verifica se as dependências estão disponíveis.
    *   Configura o FullCalendar com um objeto de configuração massivo, incluindo handlers para `eventRender`, `eventClick`, `dayClick`, `eventDrop`, `viewRender`, etc.
    *   `eventRender` chama `this.eventColorManager.getColorForEvent()` para definir a cor do evento dinamicamente.
    *   `eventClick` abre o modal seletor de cores.
    *   `dayClick` abre o modal de criação rápida.
    *   Inicializa o FullCalendar: `$(calendarEl).fullCalendar(calendarConfig)`.
    *   Define `this.calendarInitialized = true`.

Este primeiro bloco de 400 linhas estabelece a estrutura fundamental do componente, incluindo o gerenciamento de estado, carregamento de dependências, e a complexa inicialização e configuração do FullCalendar. A introdução do `EventColorManager` para centralizar a lógica de cores é uma decisão de design chave.
