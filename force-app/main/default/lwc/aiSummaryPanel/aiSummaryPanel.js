import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import floatingUI from '@salesforce/resourceUrl/floatingUI';
import generateEventSummary from '@salesforce/apex/OpenAIController.generateEventSummary';
import generateMeetingSuggestions from '@salesforce/apex/OpenAIController.generateMeetingSuggestions';
import testOpenAIConnection from '@salesforce/apex/OpenAIController.testOpenAIConnection';
import getCacheStatistics from '@salesforce/apex/OpenAIController.getCacheStatistics';

/**
 * AI Summary Panel Component for Calendar Integration
 * Provides AI-powered insights and summaries for calendar events
 * @author Reino Capital Development Team
 * @version 1.0.0
 */
export default class AiSummaryPanel extends LightningElement {
    @api startDate;
    @api endDate;
    @api currentView = 'month';
    
    @track summaryData = {};
    @track isLoading = false;
    @track error = null;
    @track activeTab = 'summary';
    @track connectionStatus = 'unknown'; // unknown, connected, error
    @track cacheStats = null;

    // Modal properties
    @track isModalVisible = false;
    @track isPinned = false;
    @track modalPosition = null;
    
    // Summary types
    summaryTypes = [
        { label: 'Resumo Mensal', value: 'monthly' },
        { label: 'Resumo Semanal', value: 'weekly' },
        { label: 'Próximos Eventos', value: 'upcoming' }
    ];
    
    selectedSummaryType = 'monthly';
    
    connectedCallback() {
        // Test connection first, then auto-load summary
        this.testConnection();
        this.loadCacheStats();
        this.initializeDragFunctionality();
    }

    renderedCallback() {
        if (this.isModalVisible) {
            this.initializeDragFunctionality();
        }
    }
    
    // Computed properties
    get sectionIcon() {
        return this.isExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }
    
    get connectionIcon() {
        switch (this.connectionStatus) {
            case 'connected':
                return 'utility:success';
            case 'error':
                return 'utility:error';
            default:
                return 'utility:info';
        }
    }
    
    get connectionIconVariant() {
        switch (this.connectionStatus) {
            case 'connected':
                return 'success';
            case 'error':
                return 'error';
            default:
                return 'warning';
        }
    }
    
    get connectionText() {
        switch (this.connectionStatus) {
            case 'connected':
                return this.cacheStats ?
                    `IA Conectada (Cache: ${this.cacheStats.activeEntries} entradas)` :
                    'IA Conectada';
            case 'error':
                return 'IA Desconectada';
            default:
                return 'Testando IA...';
        }
    }
    
    get hasSummary() {
        return this.summaryData && this.summaryData.summary;
    }
    
    get hasInsights() {
        return this.summaryData && this.summaryData.insights && this.summaryData.insights.length > 0;
    }
    
    get hasRecommendations() {
        return this.summaryData && this.summaryData.recommendations && this.summaryData.recommendations.length > 0;
    }
    
    get tabClasses() {
        return {
            summary: `slds-tabs_default__item ${this.activeTab === 'summary' ? 'slds-is-active' : ''}`,
            insights: `slds-tabs_default__item ${this.activeTab === 'insights' ? 'slds-is-active' : ''}`,
            suggestions: `slds-tabs_default__item ${this.activeTab === 'suggestions' ? 'slds-is-active' : ''}`
        };
    }

    get isSummaryTabActive() {
        return this.activeTab === 'summary';
    }

    get isInsightsTabActive() {
        return this.activeTab === 'insights';
    }

    get isSuggestionsTabActive() {
        return this.activeTab === 'suggestions';
    }
    
    get showContent() {
        return this.connectionStatus === 'connected' && !this.isLoading;
    }
    
    get showConnectionError() {
        return this.connectionStatus === 'error' && !this.isLoading;
    }

    // Modal computed properties
    get modalClass() {
        let classes = 'accordion-popup ai-insights-popup positioned';
        if (this.isPinned) {
            classes += ' pinned-popup';
        }
        return classes;
    }

    get modalStyle() {
        if (this.modalPosition) {
            return `position: fixed; top: ${this.modalPosition.top}px; left: ${this.modalPosition.left}px; right: auto;`;
        }
        // Default position - right side of screen
        return 'position: fixed; top: 100px; right: 80px; left: auto;';
    }

    get pinIcon() {
        return this.isPinned ? 'utility:pinned' : 'utility:pin';
    }

    get pinTitle() {
        return this.isPinned ? 'Desafixar painel' : 'Fixar painel';
    }
    
    // Event handlers
    handleToggleModal() {
        this.isModalVisible = !this.isModalVisible;

        // Auto-load summary when opening if connected and no data
        if (this.isModalVisible && this.connectionStatus === 'connected' && !this.hasSummary) {
            this.loadSummary(this.selectedSummaryType);
        }
    }

    handleCloseModal() {
        if (!this.isPinned) {
            this.isModalVisible = false;
        }
    }

    handleTogglePin() {
        this.isPinned = !this.isPinned;
    }
    
    handleTabClick(event) {
        event.preventDefault();
        const tabName = event.target.dataset.tab;
        this.activeTab = tabName;
        
        if (tabName === 'suggestions') {
            this.loadMeetingSuggestions();
        }
    }
    
    handleSummaryTypeChange(event) {
        this.selectedSummaryType = event.detail.value;
        this.loadSummary(this.selectedSummaryType);
    }
    
    handleRefresh() {
        this.loadSummary(this.selectedSummaryType);
        this.loadCacheStats(); // Update cache stats on refresh
    }

    handleCopyInsight(event) {
        event.stopPropagation(); // Prevent modal from closing
        event.preventDefault();

        const insightText = event.target.dataset.insightText;
        if (insightText) {
            this.copyTextToClipboard(insightText, event.target);
        }
    }

    handleCopySummary(event) {
        event.stopPropagation(); // Prevent modal from closing
        event.preventDefault();

        const summaryText = event.target.dataset.summaryText;
        if (summaryText) {
            this.copyTextToClipboard(summaryText, event.target);
        }
    }

    copyTextToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            // Show success feedback
            const originalText = button.textContent;
            button.textContent = 'Copiado!';
            button.style.background = '#d4edda';
            button.style.color = '#155724';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
                button.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Erro ao copiar texto:', err);
            // Fallback for older browsers
            this.fallbackCopyTextToClipboard(text, button);
        });
    }

    fallbackCopyTextToClipboard(text, button) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                const originalText = button.textContent;
                button.textContent = 'Copiado!';
                button.style.background = '#d4edda';
                button.style.color = '#155724';

                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.style.color = '';
                }, 2000);
            }
        } catch (err) {
            console.error('Fallback: Erro ao copiar texto:', err);
        }

        document.body.removeChild(textArea);
    }
    
    handleRetryConnection() {
        this.testConnection();
    }
    
    // API methods
    async testConnection() {
        this.connectionStatus = 'unknown';

        try {
            const result = await testOpenAIConnection();

            if (result.success) {
                this.connectionStatus = 'connected';
                // Auto-load summary after successful connection
                setTimeout(() => {
                    if (this.isExpanded) {
                        this.loadSummary(this.selectedSummaryType);
                    }
                }, 500);
            } else {
                this.connectionStatus = 'error';
                this.error = result.error || 'Erro de conexão com IA';
            }
        } catch (error) {
            this.connectionStatus = 'error';
            this.error = 'Erro ao testar conexão com IA';
            console.error('Error testing OpenAI connection:', error);
        }
    }

    async loadCacheStats() {
        try {
            const result = await getCacheStatistics();

            if (result.success) {
                this.cacheStats = result.stats;
                console.log('💾 Cache Stats:', this.cacheStats);
                console.log('💰 Estimated Savings: $' + result.estimatedSavings);
            }
        } catch (error) {
            console.error('Error loading cache stats:', error);
        }
    }
    
    async loadSummary(summaryType = 'monthly') {
        if (!this.startDate || !this.endDate) {
            this.error = 'Datas não definidas para gerar resumo';
            return;
        }
        
        if (this.connectionStatus !== 'connected') {
            this.error = 'IA não conectada. Teste a conexão primeiro.';
            return;
        }
        
        this.isLoading = true;
        this.error = null;
        this.activeTab = 'summary'; // Switch to summary tab when loading
        
        try {
            const result = await generateEventSummary({
                startDate: this.startDate,
                endDate: this.endDate,
                summaryType: summaryType
            });
            
            if (result.success) {
                // Parse the result properly - handle both string and object responses
                let summaryText = result.summary;
                let insightsArray = result.insights || [];
                let recommendationsArray = result.recommendations || [];

                // If summary is an object, convert to string
                if (typeof summaryText === 'object') {
                    summaryText = JSON.stringify(summaryText, null, 2);
                }

                // If insights/recommendations are strings, try to parse as arrays
                if (typeof insightsArray === 'string') {
                    try {
                        insightsArray = JSON.parse(insightsArray);
                    } catch (e) {
                        insightsArray = [insightsArray]; // Treat as single item array
                    }
                }

                if (typeof recommendationsArray === 'string') {
                    try {
                        recommendationsArray = JSON.parse(recommendationsArray);
                    } catch (e) {
                        recommendationsArray = [recommendationsArray]; // Treat as single item array
                    }
                }

                this.summaryData = {
                    summary: summaryText,
                    insights: Array.isArray(insightsArray) ? insightsArray : [],
                    recommendations: Array.isArray(recommendationsArray) ? recommendationsArray : []
                };

                console.log('Processed summary data:', this.summaryData);

                // Show success toast for first load
                if (!this.hasSummary) {
                    this.showToast('Sucesso', 'Resumo IA gerado com sucesso', 'success');
                }
            } else {
                this.error = result.error || 'Erro ao gerar resumo';
                this.showToast('Erro', this.error, 'error');
            }
        } catch (error) {
            this.error = 'Erro de conexão ao gerar resumo';
            this.showToast('Erro', this.error, 'error');
            console.error('Error loading AI summary:', error);
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadMeetingSuggestions() {
        if (this.connectionStatus !== 'connected') {
            return;
        }
        
        this.isLoading = true;
        
        try {
            // Get current user for suggestions (simplified for now)
            const participantIds = ['003000000000000']; // Placeholder - would get from user context
            const targetDate = new Date();
            
            const result = await generateMeetingSuggestions({
                participantIds: participantIds,
                targetDate: targetDate.toISOString().split('T')[0],
                durationMinutes: 60
            });
            
            if (result.success) {
                this.summaryData.suggestions = result.suggestions || [];
                this.summaryData.reasoning = result.reasoning || 'Nenhuma sugestão disponível';
            } else {
                console.error('Error loading meeting suggestions:', result.error);
            }
        } catch (error) {
            console.error('Error loading meeting suggestions:', error);
        } finally {
            this.isLoading = false;
        }
    }
    
    // Utility methods
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }
    
    // Public API for parent component
    @api
    refreshSummary() {
        if (this.connectionStatus === 'connected') {
            this.loadSummary(this.selectedSummaryType);
        } else {
            this.testConnection();
        }
    }
    
    @api
    updateDateRange(startDate, endDate) {
        this.startDate = startDate;
        this.endDate = endDate;
        
        // Only auto-refresh if panel is expanded and connected
        if (this.isExpanded && this.connectionStatus === 'connected') {
            this.loadSummary(this.selectedSummaryType);
        }
    }
    
    @api
    expandPanel() {
        this.isExpanded = true;
        if (this.connectionStatus === 'connected' && !this.hasSummary) {
            this.loadSummary(this.selectedSummaryType);
        }
    }
    
    @api
    showModal() {
        this.isModalVisible = true;
        if (this.connectionStatus === 'connected' && !this.hasSummary) {
            this.loadSummary(this.selectedSummaryType);
        }
    }

    @api
    hideModal() {
        this.isModalVisible = false;
    }

    // Drag functionality
    initializeDragFunctionality() {
        if (!this.isModalVisible) return;

        setTimeout(() => {
            const popupHeader = this.template.querySelector('.popup-header');
            if (popupHeader && !popupHeader.hasAttribute('data-draggable-initialized')) {
                this.makeDraggable(popupHeader);
                popupHeader.setAttribute('data-draggable-initialized', 'true');
            }
        }, 100);
    }

    makeDraggable(headerElement) {
        if (!headerElement) return;

        const popup = headerElement.closest('.accordion-popup');
        if (!popup) return;

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const handleMouseDown = (e) => {
            // Ignore if clicking on buttons or interactive elements
            if (e.target.closest('lightning-button') ||
                e.target.closest('.popup-close-button') ||
                e.target.closest('.popup-title-pin-icon')) {
                return;
            }

            isDragging = true;
            const rect = popup.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            popup.style.cursor = 'grabbing';
            popup.style.userSelect = 'none';
            popup.classList.add('dragging'); // This disables animations during drag

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;

            // Keep within viewport bounds
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const popupRect = popup.getBoundingClientRect();

            const constrainedX = Math.max(0, Math.min(newX, viewportWidth - popupRect.width));
            const constrainedY = Math.max(0, Math.min(newY, viewportHeight - popupRect.height));

            popup.style.left = `${constrainedX}px`;
            popup.style.top = `${constrainedY}px`;
            popup.style.right = 'auto';

            // Save position
            this.modalPosition = { left: constrainedX, top: constrainedY };
        };

        const handleMouseUp = () => {
            isDragging = false;
            popup.style.cursor = '';
            popup.style.userSelect = '';
            popup.classList.remove('dragging'); // Re-enable animations after drag

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        headerElement.addEventListener('mousedown', handleMouseDown);
    }
}
