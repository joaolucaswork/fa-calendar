import { LightningElement, api, wire, track } from 'lwc';
import getUserMeetingSummary from '@salesforce/apex/MeetingSummaryController.getUserMeetingSummary';

export default class MeetingSummaryModal extends LightningElement {
    @api userId;
    @api userName;
    @api currentYear;
    @api currentMonth;
    
    @track isVisible = false;
    @track isPinned = false;
    @track isLoading = false;
    @track summaryData;
    @track error;
    @track isVisible = false;
    
    // Wire the Apex method
    @wire(getUserMeetingSummary, { 
        userId: '$userId', 
        year: '$currentYear', 
        month: '$currentMonth' 
    })
    wiredMeetingSummary({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.summaryData = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.summaryData = undefined;
            console.error('Error loading meeting summary:', error);
        }
    }
    
    // Computed properties for modal styling
    get modalClass() {
        let classes = 'meeting-summary-toggle';
        if (this.isVisible) {
            classes += ' visible';
        }
        return classes;
    }

    // Format month name for display
    get formattedMonth() {
        if (!this.currentMonth) return '';

        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        const monthIndex = parseInt(this.currentMonth) - 1;
        return monthNames[monthIndex] || this.currentMonth;
    }
    

    
    // Computed properties for conditional rendering
    get hasCompletedMeetings() {
        return this.summaryData && this.summaryData.completedMeetings > 0;
    }
    
    get hasCompletedNegotiationMeetings() {
        return this.summaryData && this.summaryData.completedNegotiationMeetings > 0;
    }
    
    get hasCancelledMeetings() {
        return this.summaryData && this.summaryData.cancelledPostponedMeetings > 0;
    }
    
    get hasPendingMeetings() {
        return this.summaryData && this.summaryData.pendingMeetings > 0;
    }
    
    get hasDetailedData() {
        return this.summaryData && (
            this.hasCompletedMeetings || 
            this.hasCancelledMeetings || 
            this.hasPendingMeetings
        );
    }
    
    // Public API methods
    @api
    showToggle(userId, userName, currentYear, currentMonth) {
        this.userId = userId;
        this.userName = userName;
        this.currentYear = currentYear;
        this.currentMonth = currentMonth;

        this.isVisible = true;
        this.isLoading = true;
    }
    
    @api
    hideToggle() {
        this.isVisible = false;

        // Dispatch close event
        this.dispatchEvent(new CustomEvent('toggleclose'));
    }
    
    @api
    refreshSummary() {
        if (this.isVisible) {
            this.isLoading = true;
            // The @wire decorator will handle the actual loading
        }
    }


}
