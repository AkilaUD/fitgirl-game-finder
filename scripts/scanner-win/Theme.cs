using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

internal static class Theme
{
    public static readonly Color Bg = Color.FromArgb(7, 5, 9);
    public static readonly Color Panel = Color.FromArgb(13, 10, 18);
    public static readonly Color PanelInner = Color.FromArgb(18, 14, 26);
    public static readonly Color Line = Color.FromArgb(51, 32, 63);
    public static readonly Color Text = Color.FromArgb(244, 237, 247);
    public static readonly Color Muted = Color.FromArgb(150, 138, 160);
    public static readonly Color Pink = Color.FromArgb(247, 37, 133);
    public static readonly Color Pink2 = Color.FromArgb(255, 92, 162);
    public static readonly Color Cyan = Color.FromArgb(0, 255, 234);
    public static readonly Color Magenta = Color.FromArgb(181, 23, 158);
    public static readonly Color DarkBtn = Color.FromArgb(18, 14, 26);
    public static readonly Color Success = Color.FromArgb(120, 220, 160);

    public static void ApplyForm(Form form)
    {
        form.BackColor = Bg;
        form.ForeColor = Text;
        form.Font = new Font("Segoe UI", 9.5f);
        form.FormBorderStyle = FormBorderStyle.FixedSingle;
        form.MaximizeBox = false;
        form.StartPosition = FormStartPosition.CenterScreen;
        form.MinimumSize = new Size(520, 560);
    }

    public static Button MakePrimary(string text, int height = 40)
    {
        var b = new Button
        {
            Text = text,
            FlatStyle = FlatStyle.Flat,
            BackColor = Pink,
            ForeColor = Color.FromArgb(10, 5, 16),
            Font = new Font("Segoe UI", 10f, FontStyle.Bold),
            Cursor = Cursors.Hand,
            Height = height,
            Dock = DockStyle.Top,
            Margin = new Padding(0, 4, 0, 4),
        };
        b.FlatAppearance.BorderSize = 0;
        b.FlatAppearance.MouseOverBackColor = Pink2;
        b.FlatAppearance.MouseDownBackColor = Magenta;
        return b;
    }

    public static Button MakeGhost(string text)
    {
        var b = new Button
        {
            Text = text,
            FlatStyle = FlatStyle.Flat,
            BackColor = DarkBtn,
            ForeColor = Text,
            Cursor = Cursors.Hand,
            Height = 34,
            Dock = DockStyle.Top,
        };
        b.FlatAppearance.BorderColor = Line;
        b.FlatAppearance.BorderSize = 1;
        b.FlatAppearance.MouseOverBackColor = PanelInner;
        return b;
    }

    public static TextBox MakeInput()
    {
        return new TextBox
        {
            BackColor = PanelInner,
            ForeColor = Text,
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Segoe UI", 10f),
            Dock = DockStyle.Top,
            Height = 28,
            Margin = new Padding(0, 2, 0, 6),
        };
    }

    public static TextBox MakeCodeInput()
    {
        var t = MakeInput();
        t.Font = new Font("Consolas", 18f, FontStyle.Bold);
        t.CharacterCasing = CharacterCasing.Upper;
        t.MaxLength = 6;
        t.TextAlign = HorizontalAlignment.Center;
        t.Height = 36;
        return t;
    }

    public static Label MakeHeading(string text)
    {
        return new Label
        {
            Text = text,
            ForeColor = Pink,
            Font = new Font("Segoe UI Semibold", 13f, FontStyle.Bold),
            AutoSize = true,
            Dock = DockStyle.Top,
            Margin = new Padding(0, 0, 0, 4),
        };
    }

    public static Label MakeSubheading(string text)
    {
        return new Label
        {
            Text = text,
            ForeColor = Muted,
            Font = new Font("Segoe UI", 9f),
            AutoSize = true,
            MaximumSize = new Size(460, 0),
            Dock = DockStyle.Top,
            Margin = new Padding(0, 0, 0, 10),
        };
    }

    public static Label MakeStep(string text)
    {
        return new Label
        {
            Text = text,
            ForeColor = Cyan,
            Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
            AutoSize = true,
            Dock = DockStyle.Top,
            Margin = new Padding(0, 0, 0, 2),
        };
    }

    public static Panel MakeCard()
    {
        return new CardPanel
        {
            BackColor = Panel,
            Dock = DockStyle.Top,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            Padding = new Padding(14, 12, 14, 12),
            Margin = new Padding(0, 0, 0, 10),
        };
    }

    public static void PaintTopAccent(Graphics g, int width)
    {
        using (var brush = new LinearGradientBrush(
            new Rectangle(0, 0, width, 3),
            Pink,
            Cyan,
            LinearGradientMode.Horizontal))
        {
            g.FillRectangle(brush, 0, 0, width, 3);
        }
    }
}

internal sealed class CardPanel : Panel
{
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        using (var pen = new Pen(Theme.Line, 1f))
            g.DrawRectangle(pen, 0, 0, Width - 1, Height - 1);
        using (var accent = new Pen(Color.FromArgb(160, Theme.Pink), 2f))
            g.DrawLine(accent, 0, 0, 0, Height);
        using (var hud = new Pen(Color.FromArgb(100, Theme.Cyan), 2f))
        {
            const int c = 10;
            var r = ClientRectangle;
            g.DrawLine(hud, r.Width - c - 4, r.Height - 4, r.Width - 4, r.Height - 4);
            g.DrawLine(hud, r.Width - 4, r.Height - c - 4, r.Width - 4, r.Height - 4);
        }
    }
}

internal sealed class HudPanel : Panel
{
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        Theme.PaintTopAccent(e.Graphics, Width);
    }
}