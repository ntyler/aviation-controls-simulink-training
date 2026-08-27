param(
    [Parameter(Position = 0, Mandatory = $true)]
    [string]$Mode,
    [Parameter(Position = 1, Mandatory = $true)]
    [string]$ArchivePath,
    [Parameter(Position = 2)]
    [string]$EntryName
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
try {
    if ($Mode -eq 'list') {
        foreach ($entry in $archive.Entries) {
            [Console]::Out.WriteLine($entry.FullName)
        }
        exit 0
    }

    if ($Mode -eq 'pipe') {
        $entry = $archive.Entries | Where-Object { $_.FullName -eq $EntryName } | Select-Object -First 1
        if ($null -eq $entry) {
            [Console]::Error.WriteLine("Archive entry not found: $EntryName")
            exit 11
        }
        $inputStream = $entry.Open()
        try {
            $outputStream = [Console]::OpenStandardOutput()
            $inputStream.CopyTo($outputStream)
            $outputStream.Flush()
        }
        finally {
            $inputStream.Dispose()
        }
        exit 0
    }

    [Console]::Error.WriteLine("Unsupported unzip mode: $Mode")
    exit 2
}
finally {
    $archive.Dispose()
}
