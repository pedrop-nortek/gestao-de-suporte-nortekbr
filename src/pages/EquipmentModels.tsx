import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Wrench } from 'lucide-react';

interface EquipmentModel {
  id: string;
  name: string;
  description?: string;
  manufacturer?: string;
  category?: string;
  created_at: string;
}

interface FormData {
  name: string;
  description: string;
  manufacturer: string;
  category: string;
}

export default function EquipmentModels() {
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    manufacturer: '',
    category: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_models')
        .select('*')
        .order('name');

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Error fetching equipment models:', error);
      toast.error('Failed to load equipment models');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Model name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('equipment_models')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            manufacturer: formData.manufacturer.trim() || null,
            category: formData.category.trim() || null
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Equipment model updated successfully');
      } else {
        const { error } = await supabase
          .from('equipment_models')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            manufacturer: formData.manufacturer.trim() || null,
            category: formData.category.trim() || null
          });

        if (error) throw error;
        toast.success('Equipment model created successfully');
      }

      setFormData({ name: '', description: '', manufacturer: '', category: '' });
      setEditingId(null);
      fetchModels();
    } catch (error) {
      console.error('Error saving equipment model:', error);
      toast.error('Failed to save equipment model');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (model: EquipmentModel) => {
    setFormData({
      name: model.name,
      description: model.description || '',
      manufacturer: model.manufacturer || '',
      category: model.category || ''
    });
    setEditingId(model.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment model?')) return;

    try {
      const { error } = await supabase
        .from('equipment_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Equipment model deleted successfully');
      fetchModels();
    } catch (error) {
      console.error('Error deleting equipment model:', error);
      toast.error('Failed to delete equipment model');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', manufacturer: '', category: '' });
    setEditingId(null);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Wrench className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Equipment Models</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {editingId ? 'Edit Equipment Model' : 'Add New Equipment Model'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Model Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Model A100"
                  required
                />
              </div>

              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., Nortek"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Sensor, Controller, Gateway"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingId ? 'Update Model' : 'Add Model')}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Models List */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Models ({models.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {models.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No equipment models found. Add your first model to get started.
              </p>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          {model.name}
                          {model.description && (
                            <div className="text-sm text-muted-foreground">
                              {model.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{model.manufacturer || 'N/A'}</TableCell>
                        <TableCell>{model.category || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(model)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(model.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}