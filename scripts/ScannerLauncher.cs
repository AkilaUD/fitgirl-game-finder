// Template — base64 payload injected by compile-scanner-exe.mjs
using System;
using System.Diagnostics;
using System.IO;
using System.Text;

internal static class FitGirlPcScanner
{
    private const string ScriptB64 = "__SCRIPT_B64__";

    private static int Main()
    {
        try
        {
            var dir = Path.Combine(Path.GetTempPath(), "FitGirlPcScanner");
            Directory.CreateDirectory(dir);
            var ps1 = Path.Combine(dir, "Scan.ps1");
            File.WriteAllBytes(ps1, Convert.FromBase64String(ScriptB64));

            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + ps1 + "\"",
                UseShellExecute = false,
            };
            using (var p = Process.Start(psi))
            {
                if (p == null)
                {
                    return 1;
                }
                p.WaitForExit();
                return p.ExitCode;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }
}