import { LightningElement, api, wire, track } from 'lwc';
import getUserMeetingSummary from '@salesforce/apex/MeetingSummaryController.getUserMeetingSummary';

export default class MeetingSummary extends LightningElement {
    @api userId;
    @api currentYear;
    @api currentMonth;
    
    @track summaryData;
    @track isLoading = false;
    @track error;
    
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
    
    // Lifecycle hook - called when component properties change
    connectedCallback() {
        if (this.userId && this.currentYear && this.currentMonth) {
            this.loadMeetingSummary();
        }
    }
    
    // Method to manually load meeting summary
    loadMeetingSummary() {
        if (!this.userId || !this.currentYear || !this.currentMonth) {
            return;
        }
        
        this.isLoading = true;
        // The @wire decorator will handle the actual loading
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
    
    // Handle property changes
    @api
    refreshSummary() {
        this.loadMeetingSummary();
    }
}
