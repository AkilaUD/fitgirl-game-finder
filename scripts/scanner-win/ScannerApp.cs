using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new ScannerForm());
    }
}

internal sealed class ScannerForm : Form
{
    private const string ApiBase = "https://fitgirl-game-finder.vercel.app";
    private static readonly Regex CodePattern = new Regex(@"[A-Z0-9]{6}", RegexOptions.Compiled);

    private readonly TextBox _code;
    private readonly TextBox _summary;
    private readonly Label _status;
    private readonly Button _scan;
    private readonly Button _upload;
    private readonly Button _pasteRun;
    private string _reportJson;
    private bool _busy;

    public ScannerForm()
    {
        Text = "Game Finder PC Scanner";
        ClientSize = new Size(440, 430);
        Theme.ApplyForm(this);

        var hud = new HudPanel { Dock = DockStyle.Fill };
        Controls.Add(hud);

        var grid = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 9,
            BackColor = Theme.Panel,
        };
        grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f));
        for (var i = 0; i < 9; i++)
            grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        grid.RowStyles[6] = new RowStyle(SizeType.Absolute, 112f);
        hud.Controls.Add(grid);

        int row = 0;
        grid.Controls.Add(Theme.MakeHeading("GAME FINDER · PC SCAN"), 0, row++);
        grid.Controls.Add(Theme.MakeMuted(
            "Paste the pairing code from the website to scan and send in one step, or enter it manually."), 0, row++);

        grid.Controls.Add(Theme.MakeStep("Pairing code"), 0, row++);

        var codeRow = new TableLayoutPanel
        {
            AutoSize = true,
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            Margin = new Padding(0),
        };
        codeRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f));
        codeRow.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));

        _code = Theme.MakeInput();
        _code.CharacterCasing = CharacterCasing.Upper;
        _code.MaxLength = 6;
        _code.Font = new Font("Consolas", 14f, FontStyle.Bold);
        _code.TextAlign = HorizontalAlignment.Center;
        _code.Height = 30;
        _code.Dock = DockStyle.Fill;
        _code.Margin = new Padding(0, 0, 8, 0);

        _pasteRun = Theme.MakeSecondary("Paste & run");
        _pasteRun.Height = 30;
        _pasteRun.Click += OnPasteAndRun;

        codeRow.Controls.Add(_code, 0, 0);
        codeRow.Controls.Add(_pasteRun, 1, 0);
        grid.Controls.Add(codeRow, 0, row++);

        var btnRow = new FlowLayoutPanel
        {
            AutoSize = true,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            Margin = new Padding(0, 8, 0, 8),
            Dock = DockStyle.Fill,
        };
        _scan = Theme.MakePrimary("Scan hardware");
        _scan.Width = 185;
        _scan.Margin = new Padding(0, 0, 10, 0);
        _scan.Click += OnScan;
        _upload = Theme.MakePrimary("Send to website");
        _upload.Width = 185;
        _upload.Enabled = false;
        _upload.Click += OnUpload;
        btnRow.Controls.Add(_scan);
        btnRow.Controls.Add(_upload);
        grid.Controls.Add(btnRow, 0, row++);

        grid.Controls.Add(Theme.MakeStep("Detected"), 0, row++);
        _summary = Theme.MakeInput();
        _summary.Multiline = true;
        _summary.ReadOnly = true;
        _summary.ScrollBars = ScrollBars.Vertical;
        _summary.Font = new Font("Consolas", 9f);
        _summary.Text = "Run a scan to see CPU, GPU, and RAM.";
        _summary.Dock = DockStyle.Fill;
        _summary.Margin = new Padding(0, 0, 0, 6);
        grid.Controls.Add(_summary, 0, row++);

        _status = Theme.MakeMuted("");
        grid.Controls.Add(_status, 0, row++);
    }

    private async void OnPasteAndRun(object sender, EventArgs e)
    {
        if (_busy) return;
        try
        {
            if (!Clipboard.ContainsText())
            {
                ShowStatus("Clipboard is empty — copy the 6-character code from the website first.", Theme.Pink);
                return;
            }
            if (!TrySetCodeFromPaste(Clipboard.GetText()))
            {
                ShowStatus("Could not find a 6-character pairing code in the clipboard.", Theme.Pink);
                return;
            }
            await RunScanAndUploadAsync(confirmUpload: false);
        }
        catch (Exception ex)
        {
            ShowStatus("Failed: " + ex.Message, Theme.Pink);
        }
    }

    private async void OnScan(object sender, EventArgs e)
    {
        if (_busy || !ValidCode()) return;
        await RunScanOnlyAsync();
    }

    private async void OnUpload(object sender, EventArgs e)
    {
        if (_busy || !ValidCode() || string.IsNullOrEmpty(_reportJson)) return;
        await RunUploadAsync(confirmUpload: true);
    }

    private async Task RunScanAndUploadAsync(bool confirmUpload)
    {
        if (!ValidCode()) return;
        SetBusy(true);
        try
        {
            ShowStatus("Scanning your PC…", Theme.Muted);
            _reportJson = await Task.Run(() => HardwareCollector.CollectJson());
            _summary.Text = HardwareCollector.FormatSummary(_reportJson);
            _upload.Enabled = true;
            await RunUploadAsync(confirmUpload, manageBusy: false);
        }
        catch (Exception ex)
        {
            if (!(ex is InvalidOperationException && ex.Message.StartsWith("Upload failed:", StringComparison.Ordinal)))
                ShowStatus("Scan failed: " + ex.Message, Theme.Pink);
        }
        finally
        {
            SetBusy(false);
        }
    }

    private async Task RunScanOnlyAsync()
    {
        SetBusy(true);
        _upload.Enabled = false;
        try
        {
            ShowStatus("Scanning your PC…", Theme.Muted);
            _reportJson = await Task.Run(() => HardwareCollector.CollectJson());
            _summary.Text = HardwareCollector.FormatSummary(_reportJson);
            _upload.Enabled = true;
            ShowStatus("Looks good? Send the report to the website.", Theme.Cyan);
        }
        catch (Exception ex)
        {
            ShowStatus("Scan failed: " + ex.Message, Theme.Pink);
        }
        finally
        {
            SetBusy(false);
        }
    }

    private async Task RunUploadAsync(bool confirmUpload, bool manageBusy = true)
    {
        if (!ValidCode() || string.IsNullOrEmpty(_reportJson)) return;
        if (confirmUpload)
        {
            if (MessageBox.Show(
                    "Upload this hardware report to the website?",
                    "Confirm",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question) != DialogResult.Yes)
                return;
        }

        if (manageBusy) SetBusy(true);
        try
        {
            ShowStatus("Uploading…", Theme.Muted);
            var code = _code.Text.Trim().ToUpperInvariant();
            await Task.Run(() => Upload(code, _reportJson));
            ShowStatus("Done — return to the browser to finish.", Theme.Success);
            MessageBox.Show("Report sent. Switch back to Game Finder in your browser.", "Game Finder PC Scanner",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            var msg = UserFacingUploadError(ex.Message);
            ShowStatus("Upload failed: " + msg, Theme.Pink);
            throw new InvalidOperationException("Upload failed: " + msg, ex);
        }
        finally
        {
            if (manageBusy) SetBusy(false);
        }
    }

    private void SetBusy(bool busy)
    {
        _busy = busy;
        _scan.Enabled = !busy;
        _pasteRun.Enabled = !busy;
        if (!busy && !string.IsNullOrEmpty(_reportJson)) _upload.Enabled = true;
        else if (busy) _upload.Enabled = false;
    }

    private void ShowStatus(string text, Color color)
    {
        _status.ForeColor = color;
        _status.Text = text;
    }

    private bool TrySetCodeFromPaste(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return false;
        var upper = raw.Trim().ToUpperInvariant();
        var m = CodePattern.Match(upper);
        if (!m.Success) return false;
        _code.Text = m.Value;
        return ValidCode();
    }

    private bool ValidCode()
    {
        var code = (_code.Text ?? "").Trim().ToUpperInvariant();
        if (code.Length != 6 || !CodePattern.IsMatch(code))
        {
            ShowStatus("Enter the 6-character pairing code from the website.", Theme.Pink);
            return false;
        }
        return true;
    }

    private static string UserFacingUploadError(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "Could not reach the website. Check your connection and try again.";
        if (raw.IndexOf("UPSTASH", StringComparison.OrdinalIgnoreCase) >= 0) return "The website is not ready for pairing yet. Try again later.";
        if (raw.IndexOf("health", StringComparison.OrdinalIgnoreCase) >= 0) return "The website is not ready for pairing yet. Try again later.";
        if (raw.IndexOf("503", StringComparison.Ordinal) >= 0) return "The website is not ready for pairing yet. Try again later.";
        return raw;
    }

    private static void Upload(string pairingCode, string reportJson)
    {
        var ser = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
        var report = ser.DeserializeObject(reportJson);
        var body = ser.Serialize(new Dictionary<string, object>
        {
            { "pairingCode", pairingCode },
            { "report", report },
        });
        var url = ApiBase.TrimEnd('/') + "/api/pc-scan/complete";
        var req = (HttpWebRequest)WebRequest.Create(url);
        req.Method = "POST";
        req.ContentType = "application/json; charset=utf-8";
        var bytes = Encoding.UTF8.GetBytes(body);
        req.ContentLength = bytes.Length;
        using (var stream = req.GetRequestStream()) stream.Write(bytes, 0, bytes.Length);
        try
        {
            using (var res = (HttpWebResponse)req.GetResponse()) { }
        }
        catch (WebException wex)
        {
            var msg = wex.Message;
            var err = wex.Response as HttpWebResponse;
            if (err != null)
            {
                using (var reader = new StreamReader(err.GetResponseStream()))
                {
                    var raw = reader.ReadToEnd();
                    try
                    {
                        var parsed = ser.DeserializeObject(raw) as Dictionary<string, object>;
                        if (parsed != null && parsed.ContainsKey("error") && parsed["error"] != null)
                            msg = parsed["error"].ToString();
                    }
                    catch { /* ignore */ }
                }
            }
            throw new InvalidOperationException(msg);
        }
    }
}