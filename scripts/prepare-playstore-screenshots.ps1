$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot 'assets\images\PlayStoreSelected'
$outputDir = Join-Path $repoRoot 'assets\images\PlayStoreReady'

New-Item -ItemType Directory -Force $outputDir | Out-Null

$items = @(
  @{
    Source = '01-home-dashboard.jpeg'
    Output = '01-home-dashboard-store.jpeg'
    Headline1 = '1000+'
    Headline2 = 'practice questions'
    Subtitle = 'Realistic revision with clear progress tracking.'
    Eyebrow = 'HOME'
    ThemeA = '#EEF2FF'
    ThemeB = '#E0F2FE'
    Accent = '#4F46E5'
  },
  @{
    Source = '06-study-progress.jpeg'
    Output = '02-study-progress-store.jpeg'
    Headline1 = '21'
    Headline2 = 'study topics'
    Subtitle = 'Cover the full handbook with structured lessons.'
    Eyebrow = 'STUDY'
    ThemeA = '#FFF1F2'
    ThemeB = '#FFE4E6'
    Accent = '#E11D48'
  },
  @{
    Source = '07-3d-timeline.jpeg'
    Output = '03-3d-timeline-store.jpeg'
    Headline1 = 'Interactive'
    Headline2 = 'history timeline'
    Subtitle = 'Learn key dates, events, and people visually.'
    Eyebrow = 'TIMELINE'
    ThemeA = '#111827'
    ThemeB = '#312E81'
    Accent = '#A78BFA'
  },
  @{
    Source = '08-key-dates-reference.jpeg'
    Output = '04-key-dates-reference-store.jpeg'
    Headline1 = 'Key dates'
    Headline2 = '& revision facts'
    Subtitle = 'Keep the most tested facts ready.'
    Eyebrow = 'REFERENCE'
    ThemeA = '#F8FAFC'
    ThemeB = '#E0E7FF'
    Accent = '#4F46E5'
  },
  @{
    Source = 'WhatsApp Image 2026-03-17 at 12.25.36zxcvzv.jpeg'
    Output = '05-practice-modes-store.jpeg'
    Headline1 = '100'
    Headline2 = 'practice tests'
    Subtitle = 'Train with full-length sets before exam day.'
    Eyebrow = 'PRACTICE'
    ThemeA = '#F5F3FF'
    ThemeB = '#FCE7F3'
    Accent = '#7C3AED'
  },
  @{
    Source = '03-category-progress.jpeg'
    Output = '06-category-progress-store.jpeg'
    Headline1 = 'Track'
    Headline2 = 'weak areas'
    Subtitle = 'Find weaker topics and study where it counts.'
    Eyebrow = 'FOCUS'
    ThemeA = '#FFF7ED'
    ThemeB = '#FEF3C7'
    Accent = '#EA580C'
  },
  @{
    Source = '04-flashcards.jpeg'
    Output = '07-flashcards-store.jpeg'
    Headline1 = '190'
    Headline2 = 'flashcards'
    Subtitle = 'Use spaced repetition to remember answers.'
    Eyebrow = 'MEMORY'
    ThemeA = '#ECFDF5'
    ThemeB = '#DCFCE7'
    Accent = '#059669'
  },
  @{
    Source = '05-test-results-review.jpeg'
    Output = '08-test-results-review-store.jpeg'
    Headline1 = 'Detailed'
    Headline2 = 'answer explanations'
    Subtitle = 'Review mistakes, learn why, and improve.'
    Eyebrow = 'RESULTS'
    ThemeA = '#ECFEFF'
    ThemeB = '#E0F2FE'
    Accent = '#0891B2'
  }
)

$canvasWidth = 1080
$canvasHeight = 1920
$headerHeight = 350
$screenshotMaxWidth = 860
$screenshotMaxHeight = 1380
$topCrop = 58
$bottomCrop = 220

$titleColor = [System.Drawing.Color]::FromArgb(255, 17, 24, 39)
$subtitleColor = [System.Drawing.Color]::FromArgb(255, 75, 85, 99)
$cardShadow = [System.Drawing.Color]::FromArgb(32, 15, 23, 42)
$lightStroke = [System.Drawing.Color]::FromArgb(30, 255, 255, 255)

function Convert-HexToColor {
  param([string]$Hex)

  $clean = $Hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb(
    255,
    [Convert]::ToInt32($clean.Substring(0, 2), 16),
    [Convert]::ToInt32($clean.Substring(2, 2), 16),
    [Convert]::ToInt32($clean.Substring(4, 2), 16)
  )
}

function New-RoundedPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
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

foreach ($item in $items) {
  $sourcePath = Join-Path $sourceDir $item.Source
  $outputPath = Join-Path $outputDir $item.Output
  $bgTop = Convert-HexToColor $item.ThemeA
  $bgBottom = Convert-HexToColor $item.ThemeB
  $accent = Convert-HexToColor $item.Accent

  $image = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $cropHeight = $image.Height - $topCrop - $bottomCrop
    $cropRect = New-Object System.Drawing.Rectangle(0, $topCrop, $image.Width, $cropHeight)
    $cropped = New-Object System.Drawing.Bitmap($cropRect.Width, $cropRect.Height)
    try {
      $cropGraphics = [System.Drawing.Graphics]::FromImage($cropped)
      try {
        $cropGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $cropGraphics.DrawImage($image, (New-Object System.Drawing.Rectangle(0, 0, $cropRect.Width, $cropRect.Height)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $cropGraphics.Dispose()
      }

      $scale = [Math]::Min($screenshotMaxWidth / $cropped.Width, $screenshotMaxHeight / $cropped.Height)
      $drawWidth = [int]($cropped.Width * $scale)
      $drawHeight = [int]($cropped.Height * $scale)
      $drawX = [int](($canvasWidth - $drawWidth) / 2)
      $drawY = $headerHeight + [int](($screenshotMaxHeight - $drawHeight) / 2) + 80

      $canvas = New-Object System.Drawing.Bitmap($canvasWidth, $canvasHeight)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        try {
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

          $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            (New-Object System.Drawing.Point(0, 0)),
            (New-Object System.Drawing.Point(0, $canvasHeight)),
            $bgTop,
            $bgBottom
          )
          try {
            $graphics.FillRectangle($backgroundBrush, 0, 0, $canvasWidth, $canvasHeight)
          } finally {
            $backgroundBrush.Dispose()
          }

          $shapeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, $accent.R, $accent.G, $accent.B))
          $accentBrush = New-Object System.Drawing.SolidBrush($accent)
          $titleBrush = New-Object System.Drawing.SolidBrush(
            $(if ($item.Eyebrow -eq 'TIMELINE') { [System.Drawing.Color]::FromArgb(255, 255, 255, 255) } else { $titleColor })
          )
          $subtitleBrush = New-Object System.Drawing.SolidBrush(
            $(if ($item.Eyebrow -eq 'TIMELINE') { [System.Drawing.Color]::FromArgb(220, 255, 255, 255) } else { $subtitleColor })
          )
          $shadowBrush = New-Object System.Drawing.SolidBrush($cardShadow)
          $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
          $eyebrowBrush = New-Object System.Drawing.SolidBrush(
            $(if ($item.Eyebrow -eq 'TIMELINE') { [System.Drawing.Color]::FromArgb(230, 255, 255, 255) } else { $accent })
          )
          $screenFrameBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
          $strokePen = New-Object System.Drawing.Pen($lightStroke, 2)

          try {
            $graphics.FillEllipse($shapeBrush, -120, -60, 420, 420)
            $graphics.FillEllipse($shapeBrush, 760, 1210, 360, 360)
            $graphics.FillEllipse($shapeBrush, 860, -40, 180, 180)
            $graphics.FillRectangle($shapeBrush, 0, 0, $canvasWidth, 18)

            $eyebrowFont = New-Object System.Drawing.Font('Segoe UI Semibold', 18, [System.Drawing.FontStyle]::Regular)
            $brandFont = New-Object System.Drawing.Font('Segoe UI Semibold', 18, [System.Drawing.FontStyle]::Regular)
            $headlineFont = New-Object System.Drawing.Font('Segoe UI Semibold', 58, [System.Drawing.FontStyle]::Regular)
            $headlineSmallFont = New-Object System.Drawing.Font('Segoe UI Semibold', 32, [System.Drawing.FontStyle]::Regular)
            $subtitleFont = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Regular)

            $graphics.DrawString($item.Eyebrow, $eyebrowFont, $eyebrowBrush, 84, 72)
            $graphics.DrawString('Life in the UK Test 2026', $brandFont, $subtitleBrush, 84, 104)
            $graphics.DrawString($item.Headline1, $headlineFont, $titleBrush, 84, 144)
            $graphics.DrawString($item.Headline2, $headlineSmallFont, $titleBrush, 84, 224)

            $subtitleRect = New-Object System.Drawing.RectangleF(84, 274, 910, 70)
            $subtitleFormat = New-Object System.Drawing.StringFormat
            $subtitleFormat.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
            $graphics.DrawString($item.Subtitle, $subtitleFont, $subtitleBrush, $subtitleRect, $subtitleFormat)

            $shadowPath = New-RoundedPath ($drawX + 8) ($drawY + 14) $drawWidth $drawHeight 36
            try {
              $graphics.FillPath($shadowBrush, $shadowPath)
            } finally {
              $shadowPath.Dispose()
            }

            $cardPath = New-RoundedPath $drawX $drawY $drawWidth $drawHeight 36
            try {
              $graphics.FillPath($screenFrameBrush, $cardPath)
              $graphics.DrawPath($strokePen, $cardPath)
              $graphics.SetClip($cardPath)
              $graphics.DrawImage($cropped, $drawX, $drawY, $drawWidth, $drawHeight)
              $graphics.ResetClip()
            } finally {
              $cardPath.Dispose()
            }

            $badgePath = New-RoundedPath 84 1768 352 74 24
            try {
              $graphics.FillPath($accentBrush, $badgePath)
              $graphics.DrawString('British Citizenship Prep', (New-Object System.Drawing.Font('Segoe UI Semibold', 18, [System.Drawing.FontStyle]::Regular)), $whiteBrush, 112, 1788)
            } finally {
              $badgePath.Dispose()
            }
          } finally {
            $shapeBrush.Dispose()
            $accentBrush.Dispose()
            $titleBrush.Dispose()
            $subtitleBrush.Dispose()
            $shadowBrush.Dispose()
            $whiteBrush.Dispose()
            $eyebrowBrush.Dispose()
            $screenFrameBrush.Dispose()
            $strokePen.Dispose()
          }
        } finally {
          $graphics.Dispose()
        }

        $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      } finally {
        $canvas.Dispose()
      }
    } finally {
      $cropped.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}
