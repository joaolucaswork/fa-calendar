# Análise do Código: calendarioReino.js (Linhas 0801-1200)

**Observações e Detalhes de Funções:**

Esta seção finaliza a lógica da sidebar e a navegação principal do calendário, além de conter handlers de UI importantes.

*   **Finalização da Lógica da Sidebar:**
    *   **`handleSidebarMonthChange(event)`**: Conclui a lógica para navegar entre os meses no mini-calendário da sidebar.
    *   **`updateSidebarDateTime()`**: Atualiza o mês e ano exibidos na sidebar para refletir a data atual do calendário principal.

*   **Navegação Principal do Calendário:**
    *   **`handleTodayClick()`**: Navega o calendário do FullCalendar para a data atual usando `this.calendar.fullCalendar('today')`.
    *   **`handlePrevClick()`**: Navega para o período anterior (dia/semana/mês anterior) usando `this.calendar.fullCalendar('prev')`.
    *   **`handleNextClick()`**: Navega para o próximo período usando `this.calendar.fullCalendar('next')`.
    *   **`changeCalendarView(event)`**: Altera a visualização do calendário (mês, semana, dia) com base na seleção do usuário, usando `this.calendar.fullCalendar('changeView', viewName)`.

*   **Manipuladores de UI e Acessibilidade:**
    *   **`handleWindowResize()`**: Um handler para o evento de `resize` da janela. É usado para re-renderizar o calendário (`this.calendar.fullCalendar('render')`) para que ele se ajuste ao novo tamanho da tela. A chamada é "debounced" para evitar execuções excessivas durante o redimensionamento.

*   **Gerenciamento de Filtros (Continuação):**
    *   **`updateAvailableEventTypes()`**: Busca os tipos de evento disponíveis via Apex (`getEventTypes`) e popula a lista de opções para o filtro de tipo de evento.
    *   **`updateUserCalendarOptions()`**: Busca a lista de usuários/calendários disponíveis para o usuário logado via Apex (`getCalendarUsers`) e popula o combobox de seleção de calendário.

Este bloco de código foca na experiência do usuário, fornecendo controles de navegação intuitivos e garantindo que a UI seja responsiva e acessível.
