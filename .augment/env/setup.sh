#!/bin/bash

# Salesforce LWC Jest Test Environment Setup
set -e

echo "🚀 Setting up Salesforce LWC Jest test environment..."

# Update package lists
sudo apt-get update -qq

# Install Node.js 18 (LTS) if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | cut -d'v' -f2) -lt 18 ]]; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verify Node.js and npm versions
echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Install pnpm globally if not present
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

echo "✅ pnpm version: $(pnpm -v)"

# Navigate to project directory
cd /mnt/persist/workspace

# Install dependencies using pnpm (since pnpm-lock.yaml exists)
echo "📦 Installing project dependencies with pnpm..."
pnpm install

# Verify Jest and sfdx-lwc-jest are available
echo "🔍 Verifying test dependencies..."
if ! npx sfdx-lwc-jest --version &> /dev/null; then
    echo "❌ sfdx-lwc-jest not found, installing..."
    pnpm add -D @salesforce/sfdx-lwc-jest
fi

# Add Node.js and npm to PATH in profile
echo "🔧 Adding Node.js to PATH..."
echo 'export PATH="/usr/bin:$PATH"' >> $HOME/.profile
echo 'export NODE_PATH="/usr/lib/node_modules"' >> $HOME/.profile

# Source the profile to make changes available
source $HOME/.profile

# Create a simple test file for the colorConstants module
echo "📝 Creating a test for colorConstants module..."
mkdir -p force-app/main/default/lwc/colorConstants/__tests__
cat > force-app/main/default/lwc/colorConstants/__tests__/colorConstants.test.js << 'EOF'
import {
    COLOR_MAPPINGS,
    PRIORITY_LEVELS,
    DEFAULT_CATEGORY,
    DEFAULT_COLOR,
    BORDER_COLOR_MAPPINGS,
    COLOR_NAMES,
    STATUS_MAPPINGS,
    ROOM_MAPPINGS,
    COLOR_PICKER_OPTIONS
} from 'c/colorConstants';

describe('c-color-constants', () => {
    describe('COLOR_MAPPINGS', () => {
        it('should have categoryToColor mappings', () => {
            expect(COLOR_MAPPINGS.categoryToColor).toBeDefined();
            expect(COLOR_MAPPINGS.categoryToColor['sala-principal']).toBe('#F6E3D6');
            expect(COLOR_MAPPINGS.categoryToColor['sala-gabriel']).toBe('#E3E7FB');
            expect(COLOR_MAPPINGS.categoryToColor['aconteceu']).toBe('#D6F3E4');
        });

        it('should have colorToCategory mappings', () => {
            expect(COLOR_MAPPINGS.colorToCategory).toBeDefined();
            expect(COLOR_MAPPINGS.colorToCategory['#f6e3d6']).toBe('sala-principal');
            expect(COLOR_MAPPINGS.colorToCategory['#e3e7fb']).toBe('sala-gabriel');
        });
    });

    describe('PRIORITY_LEVELS', () => {
        it('should define priority hierarchy', () => {
            expect(PRIORITY_LEVELS.CUSTOM).toBe(1);
            expect(PRIORITY_LEVELS.STATUS).toBe(2);
            expect(PRIORITY_LEVELS.ROOM).toBe(3);
            expect(PRIORITY_LEVELS.DEFAULT).toBe(4);
        });
    });

    describe('DEFAULT_CATEGORY and DEFAULT_COLOR', () => {
        it('should have default values', () => {
            expect(DEFAULT_CATEGORY).toBe('sem-categoria');
            expect(DEFAULT_COLOR).toBe('#8A8886');
        });
    });

    describe('BORDER_COLOR_MAPPINGS', () => {
        it('should map background colors to border colors', () => {
            expect(BORDER_COLOR_MAPPINGS['#F6E3D6']).toBe('#D2691E');
            expect(BORDER_COLOR_MAPPINGS['#E3E7FB']).toBe('#4F6BED');
        });
    });

    describe('STATUS_MAPPINGS', () => {
        it('should map status strings to categories', () => {
            expect(STATUS_MAPPINGS['Cancelado']).toBe('nao-aconteceu');
            expect(STATUS_MAPPINGS['Adiado']).toBe('adiado');
            expect(STATUS_MAPPINGS['reuniaoAconteceu']).toBe('aconteceu');
        });
    });

    describe('ROOM_MAPPINGS', () => {
        it('should map room strings to categories', () => {
            expect(ROOM_MAPPINGS['salaprincipal']).toBe('sala-principal');
            expect(ROOM_MAPPINGS['sala principal']).toBe('sala-principal');
            expect(ROOM_MAPPINGS['salagabriel']).toBe('sala-gabriel');
        });
    });

    describe('COLOR_PICKER_OPTIONS', () => {
        it('should be an array of color options', () => {
            expect(Array.isArray(COLOR_PICKER_OPTIONS)).toBe(true);
            expect(COLOR_PICKER_OPTIONS.length).toBeGreaterThan(0);
            
            const firstOption = COLOR_PICKER_OPTIONS[0];
            expect(firstOption).toHaveProperty('label');
            expect(firstOption).toHaveProperty('value');
            expect(firstOption).toHaveProperty('category');
        });
    });
});
EOF

echo "✅ Setup completed successfully!"
echo "📋 Available test commands:"
echo "   - npm test (runs LWC Jest tests)"
echo "   - npm run test:unit"
echo "   - npm run test:unit:coverage"
echo ""
echo "🎯 Ready to run tests!"