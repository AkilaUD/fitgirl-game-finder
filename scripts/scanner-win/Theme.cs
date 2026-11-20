using System.Drawing;
using System.Windows.Forms;

internal static class Theme
{
    public static readonly Color Bg = Color.FromArgb(11, 8, 16);
    public static readonly Color Panel = Color.FromArgb(13, 10, 18);
    public static readonly Color Line = Color.FromArgb(51, 32, 63);
    public static readonly Color Text = Color.FromArgb(244, 237, 247);
    public static readonly Color Muted = Color.FromArgb(150, 138, 160);
    public static readonly Color Pink = Color.FromArgb(247, 37, 133);
    public static readonly Color Pink2 = Color.FromArgb(255, 92, 162);
    public static readonly Color Cyan = Color.FromArgb(0, 255, 234);
    public static readonly Color DarkBtn = Color.FromArgb(18, 14, 26);

    public static void ApplyForm(Form form)
    {
        form.BackColor = Bg;
        form.ForeColor = Text;
        form.Font = new Font("Segoe UI", 9.5f);
        form.FormBorderStyle = FormBorderStyle.FixedSingle;
        form.MaximizeBox = false;
        form.StartPosition = FormStartPosition.CenterScreen;
    }

    public static Button MakePrimary(string text)
    {
        var b = new Button
        {
            Text = text,
            FlatStyle = FlatStyle.Flat,
            BackColor = Pink,
            ForeColor = Color.FromArgb(10, 5, 16),
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            Cursor = Cursors.Hand,
            Height = 36,
            Padding = new Padding(12, 0, 12, 0),
        };
        b.FlatAppearance.BorderSize = 0;
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
            Height = 32,
        };
        b.FlatAppearance.BorderColor = Line;
        b.FlatAppearance.BorderSize = 1;
        return b;
    }

    public static TextBox MakeInput()
    {
        return new TextBox
        {
            BackColor = Panel,
            ForeColor = Text,
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Consolas", 10f),
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
        };
    }
}