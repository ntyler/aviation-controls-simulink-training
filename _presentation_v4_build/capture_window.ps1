param(
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [switch]$ScreenCapture
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class V4WindowCapture {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@

$hwnd = [V4WindowCapture]::FindWindow($null, $Title)
if ($hwnd -eq [IntPtr]::Zero) {
  $script:matchedHwnd = [IntPtr]::Zero
  $callback = [V4WindowCapture+EnumWindowsProc]{
    param([IntPtr]$candidate,[IntPtr]$lParam)
    $sb = New-Object System.Text.StringBuilder 1024
    [V4WindowCapture]::GetWindowText($candidate,$sb,$sb.Capacity) | Out-Null
    if ($sb.ToString() -like "*$Title*") { $script:matchedHwnd = $candidate; return $false }
    return $true
  }
  [V4WindowCapture]::EnumWindows($callback,[IntPtr]::Zero) | Out-Null
  $hwnd = $script:matchedHwnd
}
if ($hwnd -eq [IntPtr]::Zero) { throw "Window not found: $Title" }
[V4WindowCapture]::ShowWindow($hwnd, 3) | Out-Null
[V4WindowCapture]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 800
$rect = New-Object V4WindowCapture+RECT
if (-not [V4WindowCapture]::GetWindowRect($hwnd, [ref]$rect)) { throw "GetWindowRect failed for: $Title" }
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -lt 100 -or $height -lt 100) { throw "Invalid window dimensions ${width}x${height}" }
$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
if ($ScreenCapture) {
  $graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,(New-Object System.Drawing.Size $width,$height))
  $graphics.Dispose()
} else {
  $hdc = $graphics.GetHdc()
  try {
    $ok = [V4WindowCapture]::PrintWindow($hwnd, $hdc, 2)
  } finally {
    $graphics.ReleaseHdc($hdc)
    $graphics.Dispose()
  }
  if (-not $ok) { $bmp.Dispose(); throw "PrintWindow failed for: $Title" }
}
$fullOutput = [IO.Path]::GetFullPath($OutputPath)
$bmp.Save($fullOutput, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output $fullOutput
