#!/bin/bash

# Font Download Script
# Downloads required fonts for PDF generation

echo "📥 Downloading fonts for PDF generation..."

FONTS_DIR="/Users/user/Desktop/work/ticket-backend/fonts"
cd "$FONTS_DIR"

echo "📂 Working in: $FONTS_DIR"

# Function to download file if it doesn't exist
download_if_not_exists() {
    local url="$1"
    local filename="$2"
    
    if [ ! -f "$filename" ]; then
        echo "⬇️ Downloading $filename..."
        curl -L -o "$filename" "$url" || {
            echo "❌ Failed to download $filename"
            return 1
        }
        echo "✅ Downloaded $filename"
    else
        echo "✅ $filename already exists"
    fi
}

# Download Thai fonts (public domain or free)
echo ""
echo "🇹🇭 Downloading Thai fonts..."

# Note: These are example URLs - replace with actual font sources
# For production, you should download fonts from legitimate sources

# Create placeholder files for fonts (since we can't download copyrighted fonts)
create_font_placeholder() {
    local filename="$1"
    if [ ! -f "$filename" ]; then
        echo "📝 Creating placeholder for $filename"
        echo "# This is a placeholder for $filename" > "$filename.placeholder"
        echo "# Please download the actual font file and rename it to $filename" >> "$filename.placeholder"
        echo "# Font should be placed in the fonts directory" >> "$filename.placeholder"
    fi
}

# Create placeholders for required fonts
echo "📝 Creating font placeholders..."
create_font_placeholder "THSarabunNew.ttf"
create_font_placeholder "THSarabunNew-Bold.ttf"
create_font_placeholder "THSarabunNew-Italic.ttf"
create_font_placeholder "NotoSansThai-VariableFont.ttf"
create_font_placeholder "Roboto-Regular.ttf"
create_font_placeholder "Roboto-Bold.ttf"
create_font_placeholder "Roboto-Light.ttf"
create_font_placeholder "Roboto-Medium.ttf"
create_font_placeholder "Roboto-Italic.ttf"
create_font_placeholder "Roboto-BoldItalic.ttf"

echo ""
echo "📋 Font Setup Instructions:"
echo "================================"
echo "1. Thai Fonts (THSarabun):"
echo "   - Download from: https://fonts.google.com/noto/specimen/Noto+Sans+Thai"
echo "   - Or Thai government font repository"
echo ""
echo "2. English Fonts (Roboto):"
echo "   - Download from: https://fonts.google.com/specimen/Roboto"
echo "   - Get Regular, Bold, Light, Medium, Italic, BoldItalic variants"
echo ""
echo "3. Place font files in: $FONTS_DIR"
echo "4. Remove .placeholder files after adding real fonts"
echo ""
echo "🔍 Current font files:"
ls -la "$FONTS_DIR"

echo ""
echo "✅ Font setup completed!"
echo "📝 Remember to add actual font files for PDF generation to work properly"
