text = """
@container (min-inline-size: 20em) {
  .floor-inline-size {
    inline-size: 20em;
  }
}"""

for i in range(10, 41):
    print(text.replace("20em", f"{i}em"))
