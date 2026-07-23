Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\abeti\OneDrive\Pictures\Ai\src\assets\images\logoblack.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found at $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

$configs = @(
    @{ Name = "mipmap-mdpi"; Size = 48; ForeSize = 108 },
    @{ Name = "mipmap-hdpi"; Size = 72; ForeSize = 162 },
    @{ Name = "mipmap-xhdpi"; Size = 96; ForeSize = 216 },
    @{ Name = "mipmap-xxhdpi"; Size = 144; ForeSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192; ForeSize = 432 }
)

foreach ($cfg in $configs) {
    $folder = "c:\Users\abeti\OneDrive\Pictures\Ai\android\app\src\main\res\$($cfg.Name)"
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }

    # 1. Generate ic_launcher.png and ic_launcher_round.png with pitch black background
    $canvasSize = $cfg.Size
    $bmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Draw solid black background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
    $g.FillRectangle($bgBrush, 0, 0, $canvasSize, $canvasSize)

    # Scale logo to 70% of canvas
    $maxW = $canvasSize * 0.70
    $maxH = $canvasSize * 0.70
    $ratio = [Math]::Min($maxW / $srcImg.Width, $maxH / $srcImg.Height)
    $drawW = [Math]::Round($srcImg.Width * $ratio)
    $drawH = [Math]::Round($srcImg.Height * $ratio)
    $drawX = [Math]::Round(($canvasSize - $drawW) / 2)
    $drawY = [Math]::Round(($canvasSize - $drawH) / 2)

    $g.DrawImage($srcImg, $drawX, $drawY, $drawW, $drawH)
    $bmp.Save("$folder\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save("$folder\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    $bgBrush.Dispose()

    # 2. Generate ic_launcher_foreground.png with 60% safe scaling for Adaptive Icons
    $foreSize = $cfg.ForeSize
    $bmpFore = New-Object System.Drawing.Bitmap($foreSize, $foreSize)
    $gFore = [System.Drawing.Graphics]::FromImage($bmpFore)
    $gFore.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gFore.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gFore.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Scale logo to 58% of adaptive canvas
    $maxWFore = $foreSize * 0.58
    $maxHFore = $foreSize * 0.58
    $ratioFore = [Math]::Min($maxWFore / $srcImg.Width, $maxHFore / $srcImg.Height)
    $drawWFore = [Math]::Round($srcImg.Width * $ratioFore)
    $drawHFore = [Math]::Round($srcImg.Height * $ratioFore)
    $drawXFore = [Math]::Round(($foreSize - $drawWFore) / 2)
    $drawYFore = [Math]::Round(($foreSize - $drawHFore) / 2)

    $gFore.DrawImage($srcImg, $drawXFore, $drawYFore, $drawWFore, $drawHFore)
    $bmpFore.Save("$folder\ic_launcher_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)

    $gFore.Dispose()
    $bmpFore.Dispose()
}

$srcImg.Dispose()
Write-Output "Successfully generated perfectly fitted logoblack.png launcher icons!"
