$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

if ($args.Count -lt 2) {
    throw 'Usage: unzip -Z1 <archive> OR unzip -p <archive> <entry>'
}

$mode = $args[0]
$archivePath = [System.IO.Path]::GetFullPath($args[1])
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)

try {
    if ($mode -eq '-Z1') {
        $names = ($archive.Entries | ForEach-Object { $_.FullName }) -join "`n"
        [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
        [Console]::Out.Write($names)
        if ($names.Length -gt 0) {
            [Console]::Out.Write("`n")
        }
        exit 0
    }

    if ($mode -eq '-p' -and $args.Count -ge 3) {
        $entryName = $args[2].Replace('\', '/')
        $entry = $archive.GetEntry($entryName)
        if ($null -eq $entry) {
            throw "Archive entry not found: $entryName"
        }
        $input = $entry.Open()
        try {
            $output = [Console]::OpenStandardOutput()
            $buffer = [byte[]]::new(65536)
            while (($read = $input.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $output.Write($buffer, 0, $read)
            }
            $output.Flush()
        }
        finally {
            $input.Dispose()
        }
        exit 0
    }

    throw "Unsupported unzip arguments: $($args -join ' ')"
}
finally {
    $archive.Dispose()
}
