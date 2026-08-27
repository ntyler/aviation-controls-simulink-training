using System;
using System.IO;
using System.IO.Compression;
using System.Text;

public static class UnzipShim
{
    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("Usage: unzip -Z1 <archive> OR unzip -p <archive> <entry>");
            return 2;
        }

        try
        {
            using (ZipArchive archive = ZipFile.OpenRead(Path.GetFullPath(args[1])))
            {
                if (args[0] == "-Z1")
                {
                    Console.OutputEncoding = new UTF8Encoding(false);
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        Console.WriteLine(entry.FullName);
                    }
                    return 0;
                }

                if (args[0] == "-p" && args.Length >= 3)
                {
                    string requested = args[2].Replace('\\', '/');
                    ZipArchiveEntry entry = archive.GetEntry(requested);
                    if (entry == null)
                    {
                        Console.Error.WriteLine("Archive entry not found: " + requested);
                        return 11;
                    }

                    using (Stream input = entry.Open())
                    using (Stream output = Console.OpenStandardOutput())
                    {
                        input.CopyTo(output);
                    }
                    return 0;
                }
            }

            Console.Error.WriteLine("Unsupported arguments: " + string.Join(" ", args));
            return 2;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.ToString());
            return 1;
        }
    }
}
