// Debug script to understand product conversion issue

// Test the product conversion logic
String testProductString = 'Consultoria Societária;Gestão de Patrimônio';
System.debug('Original product string: ' + testProductString);

// Product mapping between Opportunity and Event
Map<String, String> productMapping = new Map<String, String>{
    'Gestão de Patrimônio' => 'Gestão de Patrimônio',
    'Liquidação Negociada' => 'Liquidação Otimizada',
    'Consultoria Societária' => 'Consultoria Societária'
};

// Split multi-select values and take the first matching one
List<String> products = testProductString.split(';');
System.debug('Split products: ' + products);

for (String product : products) {
    String trimmedProduct = product.trim();
    System.debug('Processing product: "' + trimmedProduct + '"');
    if (productMapping.containsKey(trimmedProduct)) {
        System.debug('Found mapping for: "' + trimmedProduct + '" -> "' + productMapping.get(trimmedProduct) + '"');
        System.debug('RESULT: ' + productMapping.get(trimmedProduct));
        break;
    } else {
        System.debug('No mapping found for: "' + trimmedProduct + '"');
    }
}

// Also test what's actually in the Opportunity
List<Opportunity> testOpps = [
    SELECT Id, Tipo_de_produto__c 
    FROM Opportunity 
    WHERE AccountId != null 
    LIMIT 1
];

if (!testOpps.isEmpty()) {
    System.debug('Actual Opportunity product: "' + testOpps[0].Tipo_de_produto__c + '"');
}
