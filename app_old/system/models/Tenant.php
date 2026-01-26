<?php

namespace System\Models;

use Igniter\Flame\Database\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'id',
        'name', 
        'domain', 
        'database_name', 
        'email', 
        'phone', 
        'start', 
        'end', 
        'type'
    ];
    }
