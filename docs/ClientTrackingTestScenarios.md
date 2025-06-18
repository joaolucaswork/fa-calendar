# Client Tracking Test Scenarios

This document describes the comprehensive test data created for the Client Tracking functionality in the calendar application.

## Overview

The test data includes 6 different client scenarios designed to test various aspects of the client tracking system:
- Active clients with different patterns
- Inactive clients that should not appear
- Edge cases and boundary conditions

## How to Run Test Data Creation

1. **Via Developer Console:**
   - Open Developer Console in your Salesforce org
   - Go to Debug > Open Execute Anonymous Window
   - Copy and paste the content from `scripts/apex/ClientTrackingTestData.apex`
   - Click Execute

2. **Via VS Code:**
   - Open the `scripts/apex/ClientTrackingTestData.apex` file
   - Use Ctrl+Shift+P (Cmd+Shift+P on Mac)
   - Select "SFDX: Execute Anonymous Apex with Currently Selected Text"
   - Select all content and execute

## Test Scenarios

### Scenario 1: João Silva - High-Activity Client ✅ SHOULD BE ACTIVE
**Company:** Empresa Test A Ltda  
**Pattern:** Multiple events + rescheduling + multiple phases  
**Events Created:** 5 events
- Initial meeting (rescheduled)
- Rescheduled first meeting (happened)
- Follow-up meeting (devolutiva)
- Negotiation phase
- Future client meeting

**Why Active:** 
- 5+ events (exceeds threshold)
- Has rescheduled events
- Multiple phases (Primeira Reunião → Devolutiva → Negociação → Cliente)
- Recent activity

### Scenario 2: Maria Santos - Cancelled/Rescheduled Pattern ✅ SHOULD BE ACTIVE
**Company:** Empresa Test B Corp  
**Pattern:** Cancellation and rescheduling pattern  
**Events Created:** 4 events
- First meeting (cancelled)
- Rescheduled first meeting (happened)
- Follow-up (cancelled)
- Rescheduled follow-up (future)

**Why Active:**
- Multiple events (4)
- Cancellation/rescheduling pattern
- Multiple phases
- Recent activity

### Scenario 3: Pedro Costa - Multi-Phase Progression ✅ SHOULD BE ACTIVE
**Company:** Empresa Test C S.A.  
**Pattern:** Clean progression through sales phases  
**Events Created:** 3 events
- First meeting (happened)
- Devolutiva (happened)
- Negotiation (happened)

**Why Active:**
- 3 events (meets threshold)
- Multiple phases progression
- Recent activity

### Scenario 4: Ana Oliveira - Recent Activity ✅ SHOULD BE ACTIVE
**Company:** Empresa Test D ME  
**Pattern:** Recent high activity  
**Events Created:** 3 events
- Recent first meeting
- Very recent follow-up
- Future negotiation

**Why Active:**
- 3 events (meets threshold)
- Very recent activity (within last 30 days)
- Multiple phases

### Scenario 5: Carlos Ferreira - Single Event ❌ SHOULD NOT BE ACTIVE
**Company:** Empresa Test E Eireli  
**Pattern:** Single old event  
**Events Created:** 1 event
- Single first meeting (60 days ago)

**Why Not Active:**
- Only 1 event (below threshold)
- Old activity (no recent events)
- Single phase only

### Scenario 6: Lucia Mendes - Old Activity ❌ SHOULD NOT BE ACTIVE
**Company:** Empresa Test F Ltda  
**Pattern:** Multiple events but very old  
**Events Created:** 2 events
- First meeting (120 days ago)
- Follow-up (100 days ago)

**Why Not Active:**
- Old activity (no recent events)
- Below multiple event threshold for recent activity

## Expected Results

After running the test data creation script, the Client Tracking Pills component should display **4 active clients**:

1. **João Silva** - Multiple events, rescheduling, multiple phases
2. **Maria Santos** - Cancellation/rescheduling pattern
3. **Pedro Costa** - Multi-phase progression
4. **Ana Oliveira** - Recent activity

The component should **NOT** display:
- Carlos Ferreira (single old event)
- Lucia Mendes (old activity)

## Testing the Client Tracking System

### 1. Visual Verification
- Open the calendar application
- Look for the "Clientes Ativos" section below the top filter bar
- Verify 4 client pills are displayed
- Check that pill colors and indicators match the tracking reasons

### 2. Filtering Functionality
- Click on each client pill
- Verify that the calendar filters to show only that client's events
- Check that the pill shows as selected (different styling)
- Verify the clear filters button appears and works

### 3. Real-time Updates
- Create a new event for one of the test clients
- Verify the client tracking data updates automatically
- Cancel or reschedule an event and check for updates

### 4. Edge Cases
- Test with date ranges that exclude some events
- Test with very large date ranges
- Test error handling with invalid data

## Data Cleanup

To clean up the test data, uncomment the cleanup section at the beginning of the test script:

```apex
// Uncomment these lines to clean up existing test data
List<Event> existingEvents = [SELECT Id FROM Event WHERE Subject LIKE '%Test Client%' OR Subject LIKE '%Teste Cliente%'];
List<Lead> existingLeads = [SELECT Id FROM Lead WHERE Company LIKE '%Empresa Test%'];
// ... rest of cleanup code
```

## Troubleshooting

### No Active Clients Showing
- Check that the test data was created successfully
- Verify the date range in the calendar includes the test events
- Check browser console for JavaScript errors
- Verify Apex controller permissions

### Wrong Number of Active Clients
- Review the client classification logic in `ClientTrackingController`
- Check the date calculations and thresholds
- Verify event data integrity

### Filtering Not Working
- Check the `handleClientFilter` method in `calendarioReino.js`
- Verify the `applyFilters` method includes client filtering
- Check for JavaScript console errors

## Performance Testing

For performance testing with larger datasets:

1. Modify the test script to create more clients (50-100)
2. Create more events per client (10-20)
3. Test component performance with large datasets
4. Monitor Apex CPU time and SOQL query limits

## Integration Testing

Test integration with existing calendar features:
- Combine client filtering with other filters (room, user, color)
- Test with appointment editor functionality
- Verify compatibility with existing event management features
