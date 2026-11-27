using System.Drawing;
using System.Windows.Forms;

internal static class Theme
{
    /* Matches site default theme (Neon) — src/styles/themes.css */
    public static readonly Color Bg = Color.FromArgb(14, 17, 17);
    public static readonly Color Panel = Color.FromArgb(26, 29, 35);
    public static readonly Color Line = Color.FromArgb(42, 47, 56);
    public static readonly Color Text = Color.FromArgb(245, 247, 250);
    public static readonly Color Muted = Color.FromArgb(154, 163, 173);
    public static readonly Color Accent = Color.FromArgb(124, 252, 0);
    public static readonly Color Accent2 = Color.FromArgb(102, 255, 0);
    public static readonly Color Glow = Color.FromArgb(184, 255, 92);
    public static readonly Color DarkBtn = Color.FromArgb(18, 21, 26);
    public static readonly Color Success = Color.FromArgb(140, 235, 120);
    public static readonly Color Error = Color.FromArgb(255, 95, 130);

    /* Aliases for control code */
    public static readonly Color Pink = Accent;
    public static readonly Color Pink2 = Accent2;
    public static readonly Color Cyan = Glow;

    public static void ApplyForm(Form form)
    {
        form.BackColor = Bg;
        form.ForeColor = Text;
        form.Font = new Font("Segoe UI", 9.5f);
        form.FormBorderStyle = FormBorderStyle.FixedDialog;
        form.MaximizeBox = false;
        form.MinimizeBox = true;
        form.StartPosition = FormStartPosition.CenterScreen;
    }

    public static Button MakePrimary(string text)
    {
        var b = new Button
        {
            Text = text,
            FlatStyle = FlatStyle.Flat,
            BackColor = Pink,
            ForeColor = Bg,
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            Cursor = Cursors.Hand,
            Height = 36,
            Width = 200,
        };
        b.FlatAppearance.BorderSize = 0;
        b.FlatAppearance.MouseOverBackColor = Pink2;
        return b;
    }

    public static Button MakeSecondary(string text)
    {
        var b = new Button
        {
            Text = text,
            FlatStyle = FlatStyle.Flat,
            BackColor = DarkBtn,
            ForeColor = Text,
            Font = new Font("Segoe UI", 9f, FontStyle.Bold),
            Cursor = Cursors.Hand,
            Height = 30,
            AutoSize = true,
            Padding = new Padding(10, 0, 10, 0),
        };
        b.FlatAppearance.BorderSize = 1;
        b.FlatAppearance.BorderColor = Line;
        b.FlatAppearance.MouseOverBackColor = Panel;
        return b;
    }

    public static TextBox MakeInput()
    {
        return new TextBox
        {
            BackColor = Panel,
            ForeColor = Text,
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Segoe UI", 9.5f),
            Anchor = AnchorStyles.Left | AnchorStyles.Right,
        };
    }

    public static Label MakeHeading(string text)
    {
        return new Label
        {
            Text = text,
            ForeColor = Pink,
            Font = new Font("Segoe UI", 11f, FontStyle.Bold),
            AutoSize = true,
            Dock = DockStyle.Fill,
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
            Dock = DockStyle.Fill,
            Margin = new Padding(0, 0, 0, 2),
        };
    }

    public static Label MakeMuted(string text)
    {
        return new Label
        {
            Text = text,
            ForeColor = Muted,
            Font = new Font("Segoe UI", 8.25f),
            AutoSize = true,
            Dock = DockStyle.Fill,
        };
    }
}

internal sealed class HudPanel : Panel
{
    public HudPanel()
    {
        BackColor = Theme.Panel;
        Padding = new Padding(20, 18, 20, 18);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g = e.Graphics;
        using (var accent = new Pen(Theme.Pink, 3f))
            g.DrawLine(accent, 0, 0, 0, Height);
        using (var hud = new Pen(Color.FromArgb(120, Theme.Cyan), 2f))
        {
            const int c = 14;
            var r = ClientRectangle;
            var inset = 6;
            g.DrawLine(hud, r.Width - inset - c, r.Height - inset, r.Width - inset, r.Height - inset);
            g.DrawLine(hud, r.Width - inset, r.Height - inset - c, r.Width - inset, r.Height - inset);
        }
        using (var border = new Pen(Theme.Line))
            g.DrawRectangle(border, 0, 0, Width - 1, Height - 1);
    }
}