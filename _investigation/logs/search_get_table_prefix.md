`grep -r "getTablePrefix" .`

<file_content>
app/admin/routes.php
401:            $p = DB::connection()->getTablePrefix();

FINAL_DEPLOYMENT_REPORT.md
113:$p = DB::connection()->getTablePrefix();
243:$p = DB::connection()->getTablePrefix();

routes.php
397:            $p = DB::connection()->getTablePrefix();

PREFIX_REFACTOR_FINAL_REPORT.md
77:$p = DB::connection()->getTablePrefix();  // ✅ Get prefix dynamically (= 'ti_')
202:$p = DB::connection()->getTablePrefix();  // Returns 'ti_'
263:- Use dynamic prefix ($p = DB::connection()->getTablePrefix()) for raw SQL

app/admin/database/migrations/2025_09_26_000001_add_columns_for_ti_tables_and_categories.php
9:        $p = DB::connection()->getTablePrefix();

PREFIX_REFACTOR_COMPLETE.md
89:$p = DB::connection()->getTablePrefix();
280:- Use dynamic prefix ($p = DB::connection()->getTablePrefix()) for raw SQL queries
336:$p = DB::connection()->getTablePrefix();

database/migrations/2025_09_26_000001_add_columns_for_ti_tables_and_categories.php
9:        $p = DB::connection()->getTablePrefix();

app/Http/Controllers/Api/MenuController.php
18:            $p = DB::connection()->getTablePrefix();
277:            $p = DB::connection()->getTablePrefix();

app/admin/controllers/Api/RestaurantController.php
54:            $p = \DB::connection()->getTablePrefix();
128:            $p = \DB::connection()->getTablePrefix();

full_differences.patch
3337:-            $prefix = DB::getTablePrefix();
3898:+            $prefix = DB::getTablePrefix();

app/system/database/migrations/2022_06_30_010000_drop_foreign_key_constraints_on_all_tables.php
38:                $table->dropIndexIfExists(sprintf('%s%s_%s_foreign', DB::getTablePrefix(), $tableName, $foreignKey));

app/admin/widgets/Lists.php
256:        return str_replace('@', DB::getTablePrefix().$table.'.', $sql);
281:                    $table = DB::getTablePrefix().$this->model->makeRelation($column->relation)->getTable();
291:                        : DB::getTablePrefix().$primaryTable.'.'.$column->columnName;

vendor/laravel/framework/src/Illuminate/Database/Console/DumpCommand.php
69:                ->withMigrationTable($connection->getTablePrefix().Config::get('database.migrations', 'migrations'))

app/admin/models/Categories_model.php
121:            $prefix = DB::getTablePrefix();

app/admin/models/Allergens_model.php
64:            $prefix = DB::getTablePrefix();

vendor/laravel/framework/src/Illuminate/Database/Schema/MySqlBuilder.php
41:        $table = $this->connection->getTablePrefix().$table;
56:        $table = $this->connection->getTablePrefix().$table;

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/ChangeColumn.php
61:        $current = $schema->listTableDetails($grammar->getTablePrefix().$blueprint->getTable());

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/RenameColumn.php
30:            $grammar->getTablePrefix().$blueprint->getTable(), $command->from

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/SqlServerGrammar.php
196:            "'".str_replace("'", "''", $this->getTablePrefix().$blueprint->getTable())."'",
238:        $tableName = $this->getTablePrefix().$blueprint->getTable();

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/Grammar.php
314:        $table = $this->getTablePrefix().$blueprint->getTable();

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/SQLiteGrammar.php
275:                $this->getTablePrefix().$blueprint->getTable(), $name
352:        $indexes = $schemaManager->listTableIndexes($this->getTablePrefix().$blueprint->getTable());
368:            $platform->getDropIndexSQL($command->from, $this->getTablePrefix().$blueprint->getTable()),
369:            $platform->getCreateIndexSQL($newIndex, $this->getTablePrefix().$blueprint->getTable()),

vendor/laravel/framework/src/Illuminate/Database/Schema/PostgresBuilder.php
43:        $table = $this->connection->getTablePrefix().$table;
174:        $table = $this->connection->getTablePrefix().$table;

vendor/laravel/framework/src/Illuminate/Database/Schema/Builder.php
132:        $table = $this->connection->getTablePrefix().$table;
182:        $table = $this->connection->getTablePrefix().$table;
196:            $this->connection->getTablePrefix().$table

app/admin/database/migrations/2022_06_30_010000_drop_foreign_key_constraints_on_all_tables.php
38:                $table->dropIndexIfExists(sprintf('%s%s_%s_foreign', DB::getTablePrefix(), $tableName, $foreignKey));

vendor/laravel/framework/src/Illuminate/Database/Grammar.php
204:    public function getTablePrefix()

vendor/laravel/framework/src/Illuminate/Database/Connection.php
1421:    public function getTablePrefix()

vendor/tastyigniter/flame/src/Database/Relations/DeferOneOrMany.php
42:                            ->where($this->getOtherKey(), $this->parent->getConnection()->raw($this->parent->getConnection()->getTablePrefix().$this->related->getQualifiedKeyName()))
55:                            ->where($this->getOtherKey(), $this->parent->getConnection()->raw($this->parent->getConnection()->getTablePrefix().$this->related->getQualifiedKeyName()))
95:                ->whereRaw(DB::parse('id > ifnull((select max(id) from '.$this->parent->getConnection()->getTablePrefix().'deferred_bindings where
128:            $this->parent->getConnection()->getTablePrefix().$this->related->getQualifiedKeyName(),
