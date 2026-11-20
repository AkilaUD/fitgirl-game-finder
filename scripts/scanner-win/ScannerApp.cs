using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal sealed class HudPanel : Panel
{
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        using (var pen = new Pen(Color.FromArgb(140, 0, 255, 234), 2f))
        {
            const int corner = 12;
            const int inset = 6;
            var r = ClientRectangle;
            g.DrawLine(pen, inset, inset, inset + corner, inset);
            g.DrawLine(pen, inset, inset, inset, inset + corner);
            g.DrawLine(pen, r.Width - inset - corner, r.Height - inset, r.Width - inset, r.Height - inset);
            g.DrawLine(pen, r.Width - inset, r.Height - inset - corner, r.Width - inset, r.Height - inset);
        }
    }
}

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
        Text = "FitGirl PC Scanner";
        ClientSize = new Size(480, 520);
        Theme.ApplyForm(this);

        var root = new HudPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(20, 16, 20, 16),
            BackColor = Theme.Panel,
        };
        Controls.Add(root);

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            AutoSize = true,
        };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f));
        root.Controls.Add(layout);

        layout.Controls.Add(Theme.MakeHeading("REPACK FINDER · PC SCAN"), 0, 0);
        layout.Controls.Add(Pad(Theme.MakeStep("Pairs with the website — nothing uploads until you confirm."), 0, 6), 0, 1);

        var smart = new Label
        {
            Text =
                "Windows SmartScreen may warn because this installer is not code-signed yet. "
                + "Click \"More info\" → \"Run anyway\". No install — portable scanner only.",
            ForeColor = Theme.Muted,
            Font = new Font("Segoe UI", 8.25f),
            AutoSize = true,
            MaximumSize = new Size(420, 0),
        };
        layout.Controls.Add(Pad(smart, 0, 8), 0, 2);

        layout.Controls.Add(Pad(MakeField("Website API", out _api, DefaultApi), 0, 4), 0, 3);
        _api.Font = new Font("Segoe UI", 9f);

        layout.Controls.Add(Pad(MakeField("Pairing code (6 chars)", out _code, ""), 0, 4), 0, 4);
        _code.CharacterCasing = CharacterCasing.Upper;
        _code.MaxLength = 6;

        _scan = Theme.MakePrimary("Scan hardware");
        _scan.Click += OnScan;
        layout.Controls.Add(Pad(_scan, 0, 8), 0, 5);

        _summary = Theme.MakeInput();
        _summary.Multiline = true;
        _summary.ReadOnly = true;
        _summary.Height = 120;
        _summary.ScrollBars = ScrollBars.Vertical;
        _summary.Font = new Font("Consolas", 9f);
        _summary.Text = "Run a scan to see CPU, GPU, and RAM.";
        layout.Controls.Add(Pad(Wrap("Detected", _summary), 0, 6), 0, 6);

        _upload = Theme.MakePrimary("Send report to website");
        _upload.Enabled = false;
        _upload.Click += OnUpload;
        layout.Controls.Add(Pad(_upload, 0, 6), 0, 7);

        _status = new Label
        {
            ForeColor = Theme.Muted,
            AutoSize = true,
            MaximumSize = new Size(420, 0),
        };
        layout.Controls.Add(_status, 0, 8);
    }

    private static Control Pad(Control c, int top, int bottom)
    {
        c.Margin = new Padding(0, top, 0, bottom);
        return c;
    }

    private static Control Wrap(string label, Control input)
    {
        var f = new TableLayoutPanel { AutoSize = true, ColumnCount = 1 };
        var l = Theme.MakeStep(label);
        f.Controls.Add(l);
        f.Controls.Add(input);
        return f;
    }

    private static Control MakeField(string label, out TextBox box, string value)
    {
        var f = new TableLayoutPanel { AutoSize = true, ColumnCount = 1 };
        f.Controls.Add(Theme.MakeStep(label));
        box = Theme.MakeInput();
        box.Text = value;
        f.Controls.Add(box);
        return f;
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
            _status.ForeColor = Color.FromArgb(120, 220, 160);
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