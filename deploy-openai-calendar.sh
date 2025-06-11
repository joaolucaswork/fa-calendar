#!/bin/bash

echo "========================================"
echo "   DEPLOY OPENAI + CALENDAR SYSTEM"
echo "========================================"
echo

echo "[1/6] Deploying Custom Object (OpenAI_Config__mdt)..."
sf project deploy start --metadata CustomObject:OpenAI_Config__mdt --test-level NoTestRun
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to deploy Custom Object"
    exit 1
fi
echo "✓ Custom Object deployed successfully"
echo

echo "[2/6] Deploying Custom Metadata Record..."
sf project deploy start --metadata CustomMetadata:OpenAI_Config.Default_Config --test-level NoTestRun
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to deploy Custom Metadata"
    exit 1
fi
echo "✓ Custom Metadata deployed successfully"
echo

echo "[3/6] Deploying Named Credential..."
sf project deploy start --metadata NamedCredential:OpenAI_API --test-level NoTestRun
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to deploy Named Credential"
    exit 1
fi
echo "✓ Named Credential deployed successfully"
echo

echo "[4/6] Deploying Apex Classes..."
sf project deploy start --metadata ApexClass:OpenAIController,ApexClass:EventSummaryGenerator,ApexClass:OpenAICacheManager,ApexClass:OpenAICacheManagerTest --test-level NoTestRun
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to deploy Apex Classes"
    exit 1
fi
echo "✓ Apex Classes deployed successfully (with intelligent caching!)"
echo

echo "[5/6] Deploying Lightning Web Components..."
sf project deploy start --metadata LightningComponentBundle:aiSummaryPanel,LightningComponentBundle:calendarioReino --test-level NoTestRun
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to deploy LWC Components"
    exit 1
fi
echo "✓ LWC Components deployed successfully"
echo

echo "[6/6] Creating Remote Site Setting..."
echo "NOTE: You need to manually create Remote Site Setting:"
echo "  - Name: OpenAI_API"
echo "  - URL: https://api.openai.com"
echo "  - Active: true"
echo

echo "========================================"
echo "   DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "========================================"
echo
echo "NEXT STEPS:"
echo "1. Configure OpenAI API Key in Named Credential"
echo "2. Create Remote Site Setting (see above)"
echo "3. Test the integration"
echo
