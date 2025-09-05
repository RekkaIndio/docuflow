# Admin Editable Policy System

This system transforms static policy PDFs into customizable documents where **administrators** can fill in placeholder fields before generating personalized PDFs. Regular users can only view the published policies.

## How It Works

### 1. Policy Templates
- Policy markdown files in `src/policies/` contain placeholder fields like `[Insert Data]`, `[INSERT CARE HOME NAME]`, etc.
- These placeholders are automatically detected and converted into form fields

### 2. Admin Editable Interface
- **Admins** access the policy editor via `/admin/policies` → "Edit & Customize" button
- The system loads the policy template and shows a form with all placeholder fields
- Required fields (dates, care home names, data fields) are marked with asterisks
- Real-time validation ensures required fields are filled
- Live preview shows how the completed policy will look

3. **Publishing Workflow**:
   - When an admin generates a PDF from the editor, it replaces the original file in `/public/policies/`
   - The PDF metadata is updated with a "Last Updated" timestamp
   - A cache refresh ensures the updated policy appears immediately to all users
   - All workspace users now see the customized version when viewing policies

4. **User Experience**:
   - Regular users see only "View" buttons on the policies page
   - Clicking "View" opens the published PDF (either the original template or admin-customized version)
   - Users cannot edit policies but always see the most up-to-date versions

### 4. PDF Generation & Publishing
- Once fields are filled, admins can generate and publish a customized PDF
- The system substitutes all placeholder values with admin input
- **The generated PDF replaces the original template** in `public/policies/`
- **All users will see the updated, filled-in version** when they view the policy
- A backup of the filled policy is saved with timestamp for audit purposes

## File Structure

```
src/
├── components/
│   └── PolicyEditor.tsx              # Admin policy editor component
├── app/
│   ├── policies/
│   │   └── page.tsx                  # User-facing read-only policies
│   ├── (protected)/
│   │   └── admin/
│   │       └── policies/
│   │           ├── page.tsx          # Admin policies management
│   │           └── [policyName]/
│   │               └── edit/
│   │                   └── page.tsx  # Admin policy editor page
│   └── api/
│       └── policies/
│           └── [policyName]/
│               ├── content/
│               │   └── route.ts      # Load policy markdown
│               ├── save/
│               │   └── route.ts      # Save filled policies
│               └── generate-pdf/
│                   └── route.ts      # Generate custom PDFs
└── policies/
    ├── filled/                       # Saved customized policies
    └── *.md                         # Original policy templates
```

## Features

### Admin Features
- **Policy Editing**: Full access to customize policies with placeholders
- **Form Validation**: Required field detection and error highlighting
- **Preview Mode**: See exactly how the filled policy will look
- **Save & Generate**: Save drafts and generate custom PDFs
- **Proper Navigation**: Integrated with admin layout and sidebar

### User Features
- **View-Only Access**: Browse and download published policies
- **No Editing**: Users cannot modify or customize policies
- **Clean Interface**: Simple policy browsing experience

## Usage for Admins

1. **Access Admin Panel**: Navigate to `/admin/policies`
2. **Edit a Policy**: Click "Edit & Customize" on any policy card
3. **Fill Required Fields**: Complete all fields marked with red asterisks
4. **Preview (Optional)**: Click "Show Preview" to see the final result
5. **Generate & Publish PDF**: Click "Generate & Publish PDF" to:
   - Create the customized document
   - Replace the original template in the system
   - Make the filled version available to all users
   - Download a copy for your records
6. **Save Draft (Optional)**: Save your progress for later completion

## Usage for Users

1. **Browse Policies**: Visit `/policies` to see available policy documents
2. **View Published Policies**: Click on any policy card to view the current published version
   - If an admin has customized a policy, users will see the filled-in version
   - If not customized, users will see the original template
3. **Download**: PDFs can be downloaded directly from the viewer

## Placeholder Field Types

The system automatically detects field types:
- **Date fields**: Any placeholder containing "date" becomes a date picker
- **Text fields**: Standard text input for names, addresses, etc.
- **Text areas**: For longer content (can be configured per field)

## Benefits

1. **Admin Control**: Only authorized administrators can customize and publish policies
2. **User Safety**: Regular users cannot accidentally modify official documents
3. **Centralized Publishing**: Generated PDFs replace templates, ensuring all users see the same updated version
4. **Consistency**: Ensures all required information is included via validation
5. **Efficiency**: No need to manually edit PDFs or Word documents
6. **Compliance**: Maintains proper formatting and structure while allowing customization
7. **Version Control**: Original templates remain unchanged, customizations are tracked separately with timestamps
8. **Proper Permissions**: Clear separation between admin editing and user viewing
9. **Unified Experience**: All workspaces see the same updated policies automatically

This system maintains the professional appearance of your policies while making them adaptable to different care homes and situations, with proper access controls and centralized publishing to ensure consistency across all users.