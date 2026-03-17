$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param(
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height,
        [int]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $Radius * 2
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

$root = Split-Path -Parent $PSScriptRoot
$iconPath = Join-Path $root "assets\images\icon.png"
$outputPath = Join-Path $root "assets\images\PlayStoreReady\feature-graphic-1024x500.png"

if (-not (Test-Path $iconPath)) {
    throw "Icon not found at $iconPath"
}

$width = 1024
$height = 500
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $backgroundRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($width, $height)),
        ([System.Drawing.Color]::FromArgb(26, 26, 46)),
        ([System.Drawing.Color]::FromArgb(79, 70, 229))
    )
    $graphics.FillRectangle($backgroundBrush, $backgroundRect)

    $accentBrush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
    $accentBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, 255, 255, 255))
    $graphics.FillEllipse($accentBrush1, 700, -90, 340, 340)
    $graphics.FillEllipse($accentBrush2, -100, 300, 280, 280)

    $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 255, 255, 255))
    $panelPath = New-RoundedRectPath -X 52 -Y 70 -Width 220 -Height 220 -Radius 34
    $graphics.FillPath($panelBrush, $panelPath)

    $iconImage = [System.Drawing.Image]::FromFile($iconPath)
    try {
        $graphics.DrawImage($iconImage, 72, 90, 180, 180)
    }
    finally {
        $iconImage.Dispose()
    }

    $titleFont = New-Object System.Drawing.Font("Segoe UI", 38, [System.Drawing.FontStyle]::Bold)
    $subtitleFont = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Regular)
    $badgeFont = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)

    $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $highlightBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(191, 219, 254))
    $subtitleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 235, 245))

    $graphics.DrawString("Life in the UK", $titleFont, $titleBrush, 320, 105)
    $graphics.DrawString("Test 2026", $titleFont, $highlightBrush, 320, 155)
    $graphics.DrawString("Quizzes, mock exams and flashcards", $subtitleFont, $subtitleBrush, 322, 230)
    $graphics.DrawString("to help you pass first time", $subtitleFont, $subtitleBrush, 322, 262)

    $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(38, 255, 255, 255))
    $badgeTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    $badges = @(
        @{ Text = "1000+ Questions"; X = 322; Width = 165 },
        @{ Text = "100 Practice Tests"; X = 498; Width = 175 },
        @{ Text = "Works Offline"; X = 685; Width = 145 }
    )

    foreach ($badge in $badges) {
        $badgeRect = New-Object System.Drawing.Rectangle($badge.X, 334, $badge.Width, 42)
        $badgeRectF = New-Object System.Drawing.RectangleF([single]$badge.X, [single]334, [single]$badge.Width, [single]42)
        $badgePath = New-RoundedRectPath -X $badge.X -Y 334 -Width $badge.Width -Height 42 -Radius 20
        $graphics.FillPath($badgeBrush, $badgePath)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        $graphics.DrawString($badge.Text, $badgeFont, $badgeTextBrush, $badgeRectF, $format)
        $format.Dispose()
        $badgePath.Dispose()
    }

    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Created $outputPath"
}
finally {
    foreach ($resource in @(
        $graphics,
        $bitmap,
        $backgroundBrush,
        $accentBrush1,
        $accentBrush2,
        $panelBrush,
        $panelPath,
        $titleFont,
        $subtitleFont,
        $badgeFont,
        $titleBrush,
        $highlightBrush,
        $subtitleBrush,
        $badgeBrush,
        $badgeTextBrush
    )) {
        if ($null -ne $resource) {
            $resource.Dispose()
        }
    }
}
