/**
 * @description Client Tracking Pills LWC Component
 * Displays horizontal pill-shaped buttons for active/recurring clients
 * with click functionality to filter calendar events
 * @author Reino Capital
 * @last-modified 2025-01-18
 */
import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getActiveClients from '@salesforce/apex/ClientTrackingController.getActiveClients';
import getClientEvents from '@salesforce/apex/ClientTrackingController.getClientEvents';

export default class ClientTrackingPills extends LightningElement {
    // Public properties for parent component integration with debugging
    _startDate;
    _endDate;

    @api
    get startDate() {
        return this._startDate;
    }
    set startDate(value) {
        console.log('ClientTrackingPills: startDate changed', {
            oldValue: this._startDate,
            newValue: value
        });
        this._startDate = value;
        this.handleDateChange();
    }

    @api
    get endDate() {
        return this._endDate;
    }
    set endDate(value) {
        console.log('ClientTrackingPills: endDate changed', {
            oldValue: this._endDate,
            newValue: value
        });
        this._endDate = value;
        this.handleDateChange();
    }

    @api selectedClientId = null; // Currently selected client for filtering
    
    // Tracked properties
    @track activeClients = [];
    @track isLoading = false;
    @track error = null;
    @track showAllClients = false; // Toggle to show/hide all clients
    @track expandedClientId = null; // Currently expanded client for name display

    // Wire result for refreshApex
    wiredResult;

    // Flag to indicate if future date refresh is needed
    needsFutureRefresh = false;
    
    // Constants
    MAX_VISIBLE_PILLS = 8; // Maximum number of pills to show initially
    
    /**
     * Wire method to get active clients when date range changes
     */
    @wire(getActiveClients, { startDate: '$_startDate', endDate: '$_endDate' })
    wiredActiveClients(result) {
        // Store wire result for refreshApex
        this.wiredResult = result;
        const { error, data } = result;

        console.log('ClientTrackingPills: Wire called', {
            startDate: this._startDate,
            endDate: this._endDate,
            hasData: data !== undefined,
            hasError: !!error,
            dataLength: data ? data.length : 0,
            dataIsArray: Array.isArray(data),
            previousClientsLength: this.activeClients ? this.activeClients.length : 0
        });

        // Always reset loading state when wire is called
        this.isLoading = false;

        if (error) {
            // Handle error case first
            console.error('ClientTrackingPills: Error loading active clients:', error);
            this.error = error;
            this.activeClients = [];
            this.expandedClientId = null;
        } else if (data !== undefined) {
            // Handle data case (including empty arrays)
            this.error = null;

            if (Array.isArray(data) && data.length > 0) {
                // Process non-empty data
                this.activeClients = data.map((client, index) => ({
                    ...client,
                    avatarClass: this.getAvatarClass(client, index === 0, client.clientId === this.expandedClientId),
                    clientInitial: this.extractClientInitial(client.clientName),
                    isSelected: client.clientId === this.selectedClientId,
                    isFirstItem: index === 0,
                    isExpanded: this.getIsExpanded(index === 0, client.clientId === this.expandedClientId),
                    showAsCircle: this.getShowAsCircle(index === 0)
                }));
                console.log('ClientTrackingPills: Data loaded successfully', this.activeClients.length, 'clients');
            } else {
                // Handle empty data case (empty array or null)
                this.activeClients = [];
                this.expandedClientId = null;
                console.log('ClientTrackingPills: Empty data received - clearing activeClients array');
            }
        }

        console.log('ClientTrackingPills: Final state after wire', {
            activeClientsLength: this.activeClients ? this.activeClients.length : 0,
            shouldShowComponent: this.shouldShowComponent,
            shouldShowEmptyState: this.shouldShowEmptyState,
            hasError: !!this.error,
            needsFutureRefresh: this.needsFutureRefresh
        });

        // Check if we have data for a future date (potential cache issue)
        if (this.needsFutureRefresh && this.activeClients && this.activeClients.length > 0) {
            console.log('ClientTrackingPills: Future date with cached data detected, forcing refresh');
            this.needsFutureRefresh = false; // Prevent infinite loop

            // Force refresh after a small delay
            setTimeout(() => {
                this.refreshWireData();
            }, 200);
        }
    }
    
    /**
     * Handle date changes to ensure proper reactivity
     */
    handleDateChange() {
        console.log('ClientTrackingPills: Date change detected', {
            startDate: this._startDate,
            endDate: this._endDate,
            hasValidDates: !!(this._startDate && this._endDate),
            previousClientsLength: this.activeClients ? this.activeClients.length : 0
        });

        // Only reset state when both dates are available
        if (this._startDate && this._endDate) {
            // Clear expansion state but keep activeClients for now
            this.expandedClientId = null;
            this.error = null;

            // Check if this is a future date that might have cache issues
            const isFuture = this.isFutureDate(this._startDate);
            console.log('ClientTrackingPills: Date analysis', {
                startDate: this._startDate,
                isFutureDate: isFuture,
                currentYear: new Date().getFullYear(),
                inputYear: this._startDate ? new Date(this._startDate).getFullYear() : null
            });

            if (isFuture) {
                console.log('ClientTrackingPills: Future date detected, will force refresh after @wire');
                this.needsFutureRefresh = true;
            } else {
                this.needsFutureRefresh = false;
            }

            console.log('ClientTrackingPills: Date change processed, waiting for @wire');
        }
    }

    /**
     * Check if the given date is in the future (next month or later in current year, or any future year)
     */
    isFutureDate(dateString) {
        if (!dateString) return false;

        try {
            const inputDate = new Date(dateString);
            const today = new Date();

            // If it's a future year, definitely future
            if (inputDate.getFullYear() > today.getFullYear()) {
                return true;
            }

            // If it's current year, check if it's a future month
            if (inputDate.getFullYear() === today.getFullYear()) {
                const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const inputMonth = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1);
                return inputMonth > currentMonth;
            }

            // Past year, not future
            return false;
        } catch (error) {
            console.error('Error checking future date:', error);
            return false;
        }
    }

    /**
     * Force refresh of wire data using refreshApex
     */
    async refreshWireData() {
        if (this.wiredResult) {
            try {
                console.log('ClientTrackingPills: Refreshing wire data to bypass cache');
                await refreshApex(this.wiredResult);
                console.log('ClientTrackingPills: Wire data refreshed successfully');
            } catch (error) {
                console.error('ClientTrackingPills: Error refreshing wire data:', error);
            }
        }
    }

    /**
     * Reset component state conservatively
     */
    resetComponentState() {
        console.log('ClientTrackingPills: Resetting component state (conservative)');

        // Only clear expansion and error state
        this.expandedClientId = null;
        this.error = null;

        // Don't aggressively clear activeClients - let @wire handle it
        console.log('ClientTrackingPills: Conservative state reset complete');
    }

    /**
     * Lifecycle hook - component connected
     */
    connectedCallback() {
        console.log('ClientTrackingPills: connectedCallback', {
            startDate: this._startDate,
            endDate: this._endDate,
            selectedClientId: this.selectedClientId
        });

        // Don't set loading state - let @wire handle it
        this.isLoading = false;
    }

    /**
     * Load active clients data - handled by @wire
     */
    loadActiveClients() {
        // This method is no longer needed as @wire handles loading
        console.log('ClientTrackingPills: loadActiveClients called (deprecated)');
    }
    
    /**
     * Extract first initial from client name
     */
    extractClientInitial(clientName) {
        if (!clientName || typeof clientName !== 'string') {
            return '?';
        }

        // Remove extra spaces and get first character
        const trimmedName = clientName.trim();
        if (trimmedName.length === 0) {
            return '?';
        }

        // Get first character and convert to uppercase
        return trimmedName.charAt(0).toUpperCase();
    }

    /**
     * Determine if item should be expanded
     */
    getIsExpanded(isFirstItem, isRegularExpanded) {
        if (isFirstItem) {
            // First item is expanded only when no other item is expanded
            return this.expandedClientId === null;
        } else {
            // Regular items are expanded based on expandedClientId
            return isRegularExpanded;
        }
    }

    /**
     * Determine if first item should show as circle (with initial)
     */
    getShowAsCircle(isFirstItem) {
        if (!isFirstItem) return false;
        // First item shows as circle when another item is expanded
        return this.expandedClientId !== null;
    }

    /**
     * Get CSS class for avatar based on client data
     */
    getAvatarClass(client, isFirstItem = false, isExpanded = false) {
        let baseClass = 'client-avatar';

        if (isFirstItem) {
            // First item: dynamic behavior based on expansion state
            if (this.expandedClientId === null) {
                baseClass += ' first-item'; // Show as pill with name
            } else {
                baseClass += ' first-item-circle'; // Show as circle with initial
            }
        } else if (isExpanded) {
            baseClass += ' expanded';
        }

        if (client.isSelected) {
            baseClass += ' selected';
        }

        // Add class based on tracking reason for color coding
        if (client.trackingReason) {
            if (client.trackingReason.includes('Múltiplos eventos')) {
                baseClass += ' multiple-events';
            } else if (client.trackingReason.includes('reagendados')) {
                baseClass += ' rescheduled';
            } else if (client.trackingReason.includes('Múltiplas fases')) {
                baseClass += ' multiple-phases';
            } else if (client.trackingReason.includes('Atividade recente')) {
                baseClass += ' recent-activity';
            }
        }

        return baseClass;
    }
    
    /**
     * Handle pill click - expand/collapse and select/deselect client for filtering
     */
    handlePillClick(event) {
        const clientId = event.currentTarget.dataset.clientId;
        const clientName = event.currentTarget.dataset.clientName;
        const client = this.activeClients.find(c => c.clientId === clientId);

        // Handle expansion logic
        if (client.isFirstItem) {
            // First item click: collapse any expanded item
            this.expandedClientId = null;
        } else {
            // Non-first item: handle expansion toggle
            if (this.expandedClientId === clientId) {
                // Collapse if already expanded
                this.expandedClientId = null;
            } else {
                // Expand this client (collapse any other expanded client)
                this.expandedClientId = clientId;
            }
        }

        // Handle selection toggle
        if (this.selectedClientId === clientId) {
            // Deselect current client
            this.selectedClientId = null;
            this.dispatchClientFilterEvent(null, null);
        } else {
            // Select new client
            this.selectedClientId = clientId;
            this.dispatchClientFilterEvent(clientId, clientName);

            // Check if client has events in current period
            this.checkClientEventsInCurrentPeriod(clientId, clientName);
        }

        // Update pill classes
        this.updatePillSelection();

        // Scroll clicked item into view
        this.scrollItemIntoView(clientId);
    }
    
    /**
     * Update avatar selection and expansion visual state
     */
    updatePillSelection() {
        this.activeClients = this.activeClients.map((client, index) => ({
            ...client,
            isSelected: client.clientId === this.selectedClientId,
            isExpanded: this.getIsExpanded(index === 0, client.clientId === this.expandedClientId),
            showAsCircle: this.getShowAsCircle(index === 0),
            avatarClass: this.getAvatarClass({
                ...client,
                isSelected: client.clientId === this.selectedClientId
            }, index === 0, client.clientId === this.expandedClientId),
            clientInitial: this.extractClientInitial(client.clientName),
            isFirstItem: index === 0
        }));
    }
    
    /**
     * Dispatch custom event to parent component for client filtering
     */
    dispatchClientFilterEvent(clientId, clientName) {
        const filterEvent = new CustomEvent('clientfilter', {
            detail: {
                clientId: clientId,
                clientName: clientName,
                isActive: clientId !== null
            }
        });
        this.dispatchEvent(filterEvent);
    }
    
    /**
     * Handle show/hide all clients toggle
     */
    handleToggleShowAll() {
        this.showAllClients = !this.showAllClients;
    }
    
    /**
     * Clear all client filters, search, and expansions
     */
    handleClearFilters() {
        this.selectedClientId = null;
        this.expandedClientId = null;
        this.updatePillSelection();
        this.dispatchClientFilterEvent(null, null);

        // Also dispatch event to clear search
        this.dispatchClearSearchEvent();
    }

    /**
     * Dispatch custom event to clear search box
     */
    dispatchClearSearchEvent() {
        const clearSearchEvent = new CustomEvent('clearsearch', {
            detail: {
                clearSearch: true
            }
        });
        this.dispatchEvent(clearSearchEvent);
    }
    
    /**
     * Show toast message
     */
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
    
    /**
     * Get visible clients based on show all toggle
     */
    get visibleClients() {
        if (this.showAllClients || this.activeClients.length <= this.MAX_VISIBLE_PILLS) {
            return this.activeClients;
        }
        return this.activeClients.slice(0, this.MAX_VISIBLE_PILLS);
    }
    
    /**
     * Check if there are more clients to show
     */
    get hasMoreClients() {
        return this.activeClients.length > this.MAX_VISIBLE_PILLS;
    }
    
    /**
     * Get toggle button label
     */
    get toggleButtonLabel() {
        if (this.showAllClients) {
            return 'Mostrar menos';
        }
        const hiddenCount = this.activeClients.length - this.MAX_VISIBLE_PILLS;
        return `+${hiddenCount} mais`;
    }
    
    /**
     * Check if component should be visible - simplified logic
     */
    get shouldShowComponent() {
        const shouldShow = this.activeClients && this.activeClients.length > 0;
        console.log('ClientTrackingPills: shouldShowComponent', {
            shouldShow,
            clientsLength: this.activeClients ? this.activeClients.length : 0,
            isLoading: this.isLoading,
            hasStartDate: !!this.startDate,
            hasEndDate: !!this.endDate
        });
        return shouldShow;
    }

    /**
     * Check if empty state should be shown - simplified logic
     */
    get shouldShowEmptyState() {
        const shouldShow = this.activeClients && this.activeClients.length === 0;
        console.log('ClientTrackingPills: shouldShowEmptyState', {
            shouldShow,
            isLoading: this.isLoading,
            clientsLength: this.activeClients ? this.activeClients.length : 0
        });
        return shouldShow;
    }
    
    /**
     * Check if clear filters button should be visible
     */
    get shouldShowClearButton() {
        return this.selectedClientId !== null;
    }
    
    /**
     * Get component container class
     */
    get containerClass() {
        let baseClass = 'client-tracking-container';
        if (this.isLoading) {
            baseClass += ' loading';
        }
        return baseClass;
    }
    
    /**
     * Public method to refresh client data
     */
    @api
    async refreshClients() {
        console.log('ClientTrackingPills: Manual refresh requested');
        await this.refreshWireData();
    }

    /**
     * Public method to force refresh (bypass all caching)
     */
    @api
    async forceRefresh() {
        console.log('ClientTrackingPills: Force refresh requested');
        this.resetComponentState();
        await this.refreshWireData();
    }
    
    /**
     * Public method to clear selection
     */
    @api
    clearSelection() {
        this.handleClearFilters();
    }

    /**
     * Public method to clear expansions
     */
    @api
    clearExpansions() {
        this.expandedClientId = null;
        this.updatePillSelection();
    }

    /**
     * Scroll clicked item into view with smooth animation
     */
    scrollItemIntoView(clientId) {
        // Use setTimeout to allow DOM updates from expansion to complete
        setTimeout(() => {
            try {
                const avatarsList = this.template.querySelector('.avatars-list');
                const clickedItem = this.template.querySelector(`[data-client-id="${clientId}"]`);

                if (!avatarsList || !clickedItem) {
                    return;
                }

                const containerRect = avatarsList.getBoundingClientRect();
                const itemRect = clickedItem.getBoundingClientRect();
                const containerWidth = avatarsList.clientWidth;
                const itemWidth = clickedItem.offsetWidth;

                // Calculate margins for better visibility
                const margin = 20; // 20px margin from edges

                // Check if item is fully visible with margins
                const isItemFullyVisible = (
                    itemRect.left >= (containerRect.left + margin) &&
                    itemRect.right <= (containerRect.right - margin)
                );

                if (!isItemFullyVisible) {
                    const itemOffsetLeft = clickedItem.offsetLeft;
                    let targetScrollLeft;

                    // Handle edge cases
                    if (itemRect.left < containerRect.left + margin) {
                        // Item is cut off on the left - scroll to show it with margin
                        targetScrollLeft = itemOffsetLeft - margin;
                    } else if (itemRect.right > containerRect.right - margin) {
                        // Item is cut off on the right - scroll to show it with margin
                        targetScrollLeft = itemOffsetLeft - containerWidth + itemWidth + margin;
                    } else {
                        // Center the item if it's partially visible
                        targetScrollLeft = itemOffsetLeft - (containerWidth / 2) + (itemWidth / 2);
                    }

                    // Ensure scroll position is within bounds
                    const maxScrollLeft = avatarsList.scrollWidth - containerWidth;
                    targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));

                    // Only scroll if the target position is different from current
                    if (Math.abs(avatarsList.scrollLeft - targetScrollLeft) > 5) {
                        avatarsList.scrollTo({
                            left: targetScrollLeft,
                            behavior: 'smooth'
                        });
                    }
                }
            } catch (error) {
                console.error('Error scrolling item into view:', error);
            }
        }, 150); // Slightly longer delay to ensure expansion animation is visible
    }
    
    /**
     * Check if client has events in current viewing period
     */
    async checkClientEventsInCurrentPeriod(clientId, clientName) {
        if (!this._startDate || !this._endDate) {
            return;
        }

        try {
            console.log('ClientTrackingPills: Checking events for client in current period', {
                clientId,
                clientName,
                startDate: this._startDate,
                endDate: this._endDate
            });

            const clientEvents = await getClientEvents({
                clientId: clientId,
                startDate: this._startDate,
                endDate: this._endDate
            });

            console.log('ClientTrackingPills: Client events in current period', {
                clientName,
                eventsCount: clientEvents ? clientEvents.length : 0,
                events: clientEvents
            });

            if (!clientEvents || clientEvents.length === 0) {
                // No events in current period - show explanation and offer navigation
                this.handleClientWithNoCurrentEvents(clientId, clientName);
            }

        } catch (error) {
            console.error('ClientTrackingPills: Error checking client events:', error);
        }
    }

    /**
     * Handle case where client has no events in current period
     */
    handleClientWithNoCurrentEvents(clientId, clientName) {
        console.log('ClientTrackingPills: Client has no events in current period', {
            clientId,
            clientName,
            currentPeriod: `${this._startDate} to ${this._endDate}`
        });

        // Show toast explaining why client appears as active
        this.showToast(
            'Cliente Ativo - Sem Eventos no Período',
            `${clientName} aparece como ativo baseado em atividade recente, mas não tem eventos neste mês. O filtro foi aplicado mesmo assim.`,
            'info'
        );

        // Dispatch event to parent to potentially navigate to relevant period
        this.dispatchNavigationSuggestionEvent(clientId, clientName);
    }

    /**
     * Dispatch event suggesting navigation to period with client events
     */
    dispatchNavigationSuggestionEvent(clientId, clientName) {
        const navigationEvent = new CustomEvent('clientnavigationsuggestion', {
            detail: {
                clientId: clientId,
                clientName: clientName,
                message: `${clientName} não tem eventos neste período. Navegar para período com atividade?`
            }
        });
        this.dispatchEvent(navigationEvent);
    }

    /**
     * Public method to select specific client
     */
    @api
    selectClient(clientId) {
        this.selectedClientId = clientId;
        this.updatePillSelection();

        const selectedClient = this.activeClients.find(client => client.clientId === clientId);
        if (selectedClient) {
            this.dispatchClientFilterEvent(clientId, selectedClient.clientName);
            this.checkClientEventsInCurrentPeriod(clientId, selectedClient.clientName);
        }
    }
}
