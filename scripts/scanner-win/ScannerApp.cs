using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Net;
using System.Text;
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
    private const string DefaultApi = "https://fitgirl-game-finder.vercel.app";

    private readonly TextBox _api;
    private readonly TextBox _code;
    private readonly TextBox _summary;
    private readonly Label _status;
    private readonly Button _scan;
    private readonly Button _upload;
    private string _reportJson;

    public ScannerForm()
    {
        Text = "FitGirl PC Scanner · Repack Finder";
        ClientSize = new Size(520, 600);
        Theme.ApplyForm(this);

        var scroll = new Panel
        {
            Dock = DockStyle.Fill,
            AutoScroll = true,
            BackColor = Theme.Bg,
            Padding = new Padding(16, 8, 16, 16),
        };
        Controls.Add(scroll);

        var stack = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            Width = 472,
            BackColor = Theme.Bg,
        };
        scroll.Controls.Add(stack);

        var header = new HudPanel
        {
            Width = 472,
            Height = 8,
            Margin = new Padding(0, 0, 0, 12),
        };
        stack.Controls.Add(header);

        stack.Controls.Add(Theme.MakeHeading("REPACK FINDER · PC SCAN"));
        stack.Controls.Add(Theme.MakeSubheading(
            "Pair with the website in your browser. Hardware stays on this PC until you confirm upload."));

        var trust = Theme.MakeCard();
        var trustLayout = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.TopDown,
            AutoSize = true,
            WrapContents = false,
            Width = 440,
        };
        trustLayout.Controls.Add(Theme.MakeStep("Trust"));
        trustLayout.Controls.Add(new Label
        {
            Text =
                "If Windows SmartScreen appears, choose More info → Run anyway. "
                + "A properly signed build removes that prompt after reputation builds.",
            ForeColor = Theme.Muted,
            Font = new Font("Segoe UI", 8.5f),
            MaximumSize = new Size(420, 0),
            AutoSize = true,
        });
        trust.Controls.Add(trustLayout);
        stack.Controls.Add(trust);

        var apiCard = Theme.MakeCard();
        var apiLayout = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, Width = 440 };
        apiLayout.Controls.Add(Theme.MakeStep("Website API base"));
        _api = Theme.MakeInput();
        _api.Text = DefaultApi;
        _api.Width = 420;
        apiLayout.Controls.Add(_api);
        apiCard.Controls.Add(apiLayout);
        stack.Controls.Add(apiCard);

        var codeCard = Theme.MakeCard();
        var codeLayout = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, Width = 440 };
        codeLayout.Controls.Add(Theme.MakeStep("Pairing code (6 characters from the site)"));
        _code = Theme.MakeCodeInput();
        _code.Width = 200;
        codeLayout.Controls.Add(_code);
        codeCard.Controls.Add(codeLayout);
        stack.Controls.Add(codeCard);

        var actions = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.LeftToRight,
            AutoSize = true,
            WrapContents = false,
            Width = 472,
            Margin = new Padding(0, 4, 0, 8),
        };
        _scan = Theme.MakePrimary("1. Scan hardware");
        _scan.Dock = DockStyle.None;
        _scan.Width = 220;
        _scan.Margin = new Padding(0, 0, 10, 0);
        _scan.Click += OnScan;
        _upload = Theme.MakePrimary("2. Send to website");
        _upload.Dock = DockStyle.None;
        _upload.Width = 220;
        _upload.Enabled = false;
        _upload.Click += OnUpload;
        actions.Controls.Add(_scan);
        actions.Controls.Add(_upload);
        stack.Controls.Add(actions);

        var detectCard = Theme.MakeCard();
        var detectLayout = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, Width = 440 };
        detectLayout.Controls.Add(Theme.MakeStep("Detected hardware"));
        _summary = Theme.MakeInput();
        _summary.Multiline = true;
        _summary.ReadOnly = true;
        _summary.ScrollBars = ScrollBars.Vertical;
        _summary.Font = new Font("Consolas", 9.5f);
        _summary.Text = "Run a scan to see CPU, GPU, and RAM.";
        _summary.Width = 420;
        _summary.Height = 130;
        detectLayout.Controls.Add(_summary);
        detectCard.Controls.Add(detectLayout);
        stack.Controls.Add(detectCard);

        _status = new Label
        {
            ForeColor = Theme.Muted,
            AutoSize = true,
            MaximumSize = new Size(460, 0),
            Font = new Font("Segoe UI", 9f),
        };
        stack.Controls.Add(_status);

        var resetBtn = Theme.MakeGhost("Clear pairing code");
        resetBtn.Dock = DockStyle.None;
        resetBtn.Width = 160;
        resetBtn.Click += (_, __) => { _code.Clear(); _status.Text = ""; };
        stack.Controls.Add(resetBtn);
    }

    private async void OnScan(object sender, EventArgs e)
    {
        if (!ValidCode()) return;
        _scan.Enabled = false;
        _upload.Enabled = false;
        _status.ForeColor = Theme.Muted;
        _status.Text = "Collecting hardware (WMI)…";
        try
        {
            _reportJson = await Task.Run(() => HardwareCollector.CollectJson());
            _summary.Text = HardwareCollector.FormatSummary(_reportJson);
            _upload.Enabled = true;
            _status.ForeColor = Theme.Cyan;
            _status.Text = "Review detected hardware, then send if it looks correct.";
        }
        catch (Exception ex)
        {
            _status.ForeColor = Theme.Pink;
            _status.Text = "Scan failed: " + ex.Message;
        }
        finally
        {
            _scan.Enabled = true;
        }
    }

    private async void OnUpload(object sender, EventArgs e)
    {
        if (!ValidCode() || string.IsNullOrEmpty(_reportJson)) return;
        var confirm = MessageBox.Show(
            "Upload this hardware report to the website for the active pairing session?",
            "Confirm upload",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question);
        if (confirm != DialogResult.Yes) return;

        _upload.Enabled = false;
        _status.ForeColor = Theme.Muted;
        _status.Text = "Uploading…";
        try
        {
            var code = _code.Text.Trim().ToUpperInvariant();
            var api = NormalizeApi(_api.Text);
            await Task.Run(() => Upload(api, code, _reportJson));
            _status.ForeColor = Theme.Success;
            _status.Text = "Upload complete. Return to the browser — your rig should update automatically.";
            MessageBox.Show(
                "Report sent successfully.\r\nSwitch back to Repack Finder in your browser.",
                "FitGirl PC Scanner",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            _status.ForeColor = Theme.Pink;
            _status.Text = "Upload failed: " + ex.Message;
        }
        finally
        {
            _upload.Enabled = true;
        }
    }

    private bool ValidCode()
    {
        var code = (_code.Text ?? "").Trim().ToUpperInvariant();
        if (code.Length != 6 || !System.Text.RegularExpressions.Regex.IsMatch(code, "^[A-Z0-9]{6}$"))
        {
            _status.ForeColor = Theme.Pink;
            _status.Text = "Enter the 6-character pairing code from the website first.";
            return false;
        }
        return true;
    }

    private static string NormalizeApi(string raw)
    {
        var s = (raw ?? "").Trim().TrimEnd('/');
        if (!string.IsNullOrWhiteSpace(s) && !s.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            && !s.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            s = "https://" + s;
        return string.IsNullOrWhiteSpace(s) ? DefaultApi : s;
    }

    private static void Upload(string apiBase, string pairingCode, string reportJson)
    {
        var ser = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
        var report = ser.DeserializeObject(reportJson);
        var body = ser.Serialize(new Dictionary<string, object>
        {
            { "pairingCode", pairingCode },
            { "report", report },
        });
        var url = apiBase + "/api/pc-scan/complete";
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