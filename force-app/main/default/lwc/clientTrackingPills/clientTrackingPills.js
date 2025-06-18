/**
 * @description Client Tracking Pills LWC Component
 * Displays horizontal pill-shaped buttons for active/recurring clients
 * with click functionality to filter calendar events
 * @author Reino Capital
 * @last-modified 2025-01-18
 */
import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getActiveClients from '@salesforce/apex/ClientTrackingController.getActiveClients';

export default class ClientTrackingPills extends LightningElement {
    // Public properties for parent component integration
    @api startDate;
    @api endDate;
    @api selectedClientId = null; // Currently selected client for filtering
    
    // Tracked properties
    @track activeClients = [];
    @track isLoading = false;
    @track error = null;
    @track showAllClients = false; // Toggle to show/hide all clients
    
    // Constants
    MAX_VISIBLE_PILLS = 8; // Maximum number of pills to show initially
    
    /**
     * Wire method to get active clients when date range changes
     */
    @wire(getActiveClients, { startDate: '$startDate', endDate: '$endDate' })
    wiredActiveClients({ error, data }) {
        console.log('ClientTrackingPills: Wire called', {
            startDate: this.startDate,
            endDate: this.endDate,
            hasData: !!data,
            hasError: !!error,
            dataLength: data ? data.length : 0
        });

        if (data !== undefined) {
            this.isLoading = false;

            if (data && data.length > 0) {
                this.activeClients = data.map(client => ({
                    ...client,
                    pillClass: this.getPillClass(client),
                    isSelected: client.clientId === this.selectedClientId
                }));
                this.error = null;
                console.log('ClientTrackingPills: Data loaded successfully', this.activeClients.length, 'clients');
            } else {
                this.activeClients = [];
                this.error = null;
                console.log('ClientTrackingPills: No data returned');
            }
        } else if (error) {
            this.isLoading = false;
            this.error = error;
            this.activeClients = [];
            console.error('ClientTrackingPills: Error loading active clients:', error);
        }
    }
    
    /**
     * Lifecycle hook - component connected
     */
    connectedCallback() {
        console.log('ClientTrackingPills: connectedCallback', {
            startDate: this.startDate,
            endDate: this.endDate,
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
     * Get CSS class for pill based on client data
     */
    getPillClass(client) {
        let baseClass = 'client-pill';
        
        if (client.isSelected) {
            baseClass += ' selected';
        }
        
        // Add class based on tracking reason
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
     * Handle pill click - select/deselect client for filtering
     */
    handlePillClick(event) {
        const clientId = event.currentTarget.dataset.clientId;
        const clientName = event.currentTarget.dataset.clientName;
        
        // Toggle selection
        if (this.selectedClientId === clientId) {
            // Deselect current client
            this.selectedClientId = null;
            this.dispatchClientFilterEvent(null, null);
        } else {
            // Select new client
            this.selectedClientId = clientId;
            this.dispatchClientFilterEvent(clientId, clientName);
        }
        
        // Update pill classes
        this.updatePillSelection();
    }
    
    /**
     * Update pill selection visual state
     */
    updatePillSelection() {
        this.activeClients = this.activeClients.map(client => ({
            ...client,
            isSelected: client.clientId === this.selectedClientId,
            pillClass: this.getPillClass({
                ...client,
                isSelected: client.clientId === this.selectedClientId
            })
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
     * Clear all client filters
     */
    handleClearFilters() {
        this.selectedClientId = null;
        this.updatePillSelection();
        this.dispatchClientFilterEvent(null, null);
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
    refreshClients() {
        this.loadActiveClients();
    }
    
    /**
     * Public method to clear selection
     */
    @api
    clearSelection() {
        this.handleClearFilters();
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
        }
    }
}
