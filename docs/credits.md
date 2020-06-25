# Credits

Credits can be shown on the About page. If you're using the launcher in another project this can be a good way to credit people who have worked on it.

Roles can be used as categories under which profiles will show. The category that the profile is under is determined by which in their roles list is first defined.

E.G Profile roles in the order `"Two", "One", "Three"` will match `Two` first.

### Layout

```json
{
  "roles": [
    {
      ...
    }
  ],
  "profiles": [
    {
      ...
    }
  ]
}
```

### Roles

Multiple roles can be assigned to multiple profiles. They can be given colors and whether they are used as a category or not is configurable.

**Name** - The name of the role to show

**Color** - The color of the role. This can be any valid CSS color format.

**noCategory** - (Optional) - Whether or not this should be a category.

```json
{
  "name": "RoleName",
  "color": "#123456",
  "noCategory": true
}
```

### Profiles

Profiles contain information on a user - Their title (name), what roles they have, a description on them and their icon to show.

**Title** - The name of the person this profile is for.

**Roles** - A list of their roles as strings matching role names.

**Note** - A note / description of the person, usually their contribution.

**Icon** - Injected into CSS to display the icon. `url("<icon>")`.
This can be a url to a local file but can also be a base64 encoded image in the form of `data:image/<type>;base64,<encodedImage>`

```json
{
  "title": "ThatOneGuy",
  "roles": ["list", "of", "roles"],
  "note": "What he did",
  "icon": "Icon"
}
```