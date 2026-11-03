import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
import build_data as b  # noqa: E402


class FirstSentence(unittest.TestCase):
    def test_abbreviations_and_initials(self):
        self.assertEqual(b.first_sentence('Dr. No is a 1962 spy film. More.'), "Dr. No is a 1962 spy film.")
        self.assertEqual(b.first_sentence('"Johnny B. Goode" is a song. It was'), '"Johnny B. Goode" is a song.')
        self.assertEqual(b.first_sentence('"Oops!... I Did It Again" is a song. Next'), '"Oops!... I Did It Again" is a song.')
        self.assertEqual(b.first_sentence("The U.S. Army is big. Yes"), "The U.S. Army is big.")

    def test_parentheticals_and_length(self):
        self.assertEqual(b.first_sentence("Lego (LEG-oh) is a brand. More"), "Lego is a brand.")
        self.assertTrue(b.first_sentence("word " * 100).endswith("…"))


class Prices(unittest.TestCase):
    def test_rate_on_july_first(self):
        self.assertEqual(b.year_value(b.STAMP, 1975), 10)   # 13¢ arrived Dec 31, 1975
        self.assertEqual(b.year_value(b.STAMP, 2024), 68)   # 73¢ only arrived July 14
        self.assertEqual(b.year_value(b.MIN_WAGE, 2009), 6.55)  # $7.25 began July 24, 2009
        self.assertEqual(b.year_value(b.MIN_WAGE, 2010), 7.25)

    def test_parse_items_rejects_bad_lines(self):
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
            f.write("1969|spaceship|Apollo\n")
        with self.assertRaises(SystemExit):
            b.parse_items(pathlib.Path(f.name))


if __name__ == "__main__":
    unittest.main()
