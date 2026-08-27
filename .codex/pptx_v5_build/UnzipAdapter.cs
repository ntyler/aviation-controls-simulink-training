using System;
using System.IO;
using System.IO.Compression;
using System.Linq;

public static class UnzipAdapter
{
    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("Usage: unzip -Z1 <archive> | unzip -p <archive> <entry>");
            return 2;
        }

        try
        {
            using (ZipArchive archive = ZipFile.OpenRead(args[1]))
            {
                if (args[0] == "-Z1")
                {
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        Console.Out.WriteLine(entry.FullName);
                    }
                    return 0;
                }

                if (args[0] == "-p" && args.Length >= 3)
                {
                    ZipArchiveEntry entry = archive.Entries.FirstOrDefault(item => item.FullName == args[2]);
                    if (entry == null)
                    {
                        Console.Error.WriteLine("Archive entry not found: " + args[2]);
                        return 11;
                    }
                    using (Stream input = entry.Open())
                    using (Stream output = Console.OpenStandardOutput())
                    {
                        input.CopyTo(output);
                        output.Flush();
                    }
                    return 0;
                }
            }
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.ToString());
            return 1;
        }

        Console.Error.WriteLine("Unsupported unzip arguments.");
        return 2;
    }
}
